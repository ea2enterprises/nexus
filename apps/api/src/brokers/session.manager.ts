import { PocketOptionBroker } from './pocketoption.broker.js';
import { MockBroker } from './mock.broker.js';
import type { BrokerAdapter } from './broker.adapter.js';
import type { Server as SocketIOServer } from 'socket.io';

export type BrokerStatus = {
  connected: boolean;
  authenticated: boolean;
  isDemo: boolean;
  hasSsid: boolean;
  balance: number;
  reconnectAttempts: number;
};

class BrokerSessionManager {
  private poInstance: PocketOptionBroker | null = null;
  private mockInstance = new MockBroker();
  private ssid: string | null = null;
  private isDemo = true;
  private io: SocketIOServer | null = null;
  private _balance = 0;
  private _reconnectAttempts = 0;

  /** Called once from server.ts after Socket.IO is set up */
  setIO(io: SocketIOServer): void {
    this.io = io;
  }

  /** Return the correct broker for a given user mode */
  getBroker(paperMode: boolean): BrokerAdapter {
    if (paperMode) return this.mockInstance;
    if (!this.poInstance?.isConnected()) {
      throw new Error('Live broker not connected. Submit your SSID via POST /broker/session.');
    }
    return this.poInstance;
  }

  /** Connect (or reconnect) with a new SSID */
  async connect(ssid: string, isDemo: boolean): Promise<void> {
    // Tear down existing connection
    if (this.poInstance) {
      this.poInstance.removeAllListeners();
      await this.poInstance.disconnect();
    }

    this.ssid = ssid;
    this.isDemo = isDemo;
    this._reconnectAttempts = 0;

    this.poInstance = new PocketOptionBroker(ssid, isDemo);
    this._bindEvents(this.poInstance);

    await this.poInstance.connect();
  }

  /** Update SSID on an already-connected instance (re-auths without full reconnect) */
  async refreshSsid(ssid: string): Promise<void> {
    this.ssid = ssid;
    if (this.poInstance) {
      this.poInstance.updateSsid(ssid);
      // Reconnect with new SSID
      await this.connect(ssid, this.isDemo);
    }
  }

  getStatus(): BrokerStatus {
    return {
      connected: this.poInstance?.isConnected() ?? false,
      authenticated: this.poInstance?.isConnected() ?? false,
      isDemo: this.isDemo,
      hasSsid: !!this.ssid,
      balance: this._balance,
      reconnectAttempts: this._reconnectAttempts,
    };
  }

  // ─── Internal ─────────────────────────────────────────────────

  private _bindEvents(broker: PocketOptionBroker): void {
    broker.on('connected', ({ isDemo }: { isDemo: boolean }) => {
      console.log(`[SessionManager] Broker connected — ${isDemo ? 'DEMO' : 'LIVE'}`);
      this.io?.emit('broker:connected', { isDemo });
      this._reconnectAttempts = 0;
    });

    broker.on('disconnected', ({ code, reason }: { code: number; reason: string }) => {
      console.warn(`[SessionManager] Broker disconnected (${code}: ${reason})`);
      this.io?.emit('broker:disconnected', { reason: 'connection_lost', code });
    });

    broker.on('ssid_expired', () => {
      console.error('[SessionManager] SSID expired — user action required');
      this.io?.emit('broker:disconnected', { reason: 'ssid_expired' });
    });

    broker.on('reconnected', () => {
      console.log('[SessionManager] Broker reconnected');
      this.io?.emit('broker:connected', { isDemo: this.isDemo });
    });

    broker.on('reconnect_failed', () => {
      console.error('[SessionManager] All reconnect attempts exhausted');
      this.io?.emit('broker:reconnect_failed', {});
    });

    broker.on('balance', (bal: { balance: number }) => {
      this._balance = bal.balance;
      this.io?.emit('broker:balance', bal);
    });

    broker.on('error', (err: Error) => {
      console.error('[SessionManager] Broker error:', err.message);
    });
  }
}

// Singleton exported for use across services / routes
export const brokerSession = new BrokerSessionManager();
