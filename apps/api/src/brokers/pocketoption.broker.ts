import WebSocket from 'ws';
import { EventEmitter } from 'events';
import type { BrokerAdapter, TradeRequest, TradeResponse, BrokerPosition } from './broker.adapter.js';

const PO_WS_URL = 'wss://api.po.market/socket.io/?EIO=4&transport=websocket';
const CONNECT_TIMEOUT_MS = 15_000;
const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface PendingTrade {
  resolve: (result: TradeResponse) => void;
  reject: (err: Error) => void;
  timeoutId: NodeJS.Timeout;
  request: TradeRequest;
}

export class PocketOptionBroker extends EventEmitter implements BrokerAdapter {
  name = 'pocket_option';

  private ws: WebSocket | null = null;
  private ssid: string;
  private isDemo: boolean;
  private _connected = false;
  private _authenticated = false;
  private requestCounter = 0;
  private pendingTrades = new Map<number, PendingTrade>();
  private balance = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private destroyed = false;

  constructor(ssid: string, isDemo = true) {
    super();
    this.ssid = ssid;
    this.isDemo = isDemo;
  }

  // ─── Public API ───────────────────────────────────────────────

  async connect(): Promise<boolean> {
    this.destroyed = false;
    return this._openConnection();
  }

  async disconnect(): Promise<void> {
    this.destroyed = true;
    this._clearTimers();
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
    this._connected = false;
    this._authenticated = false;
  }

  isConnected(): boolean {
    return this._connected && this._authenticated;
  }

  updateSsid(ssid: string): void {
    this.ssid = ssid;
  }

  async placeTrade(request: TradeRequest): Promise<TradeResponse> {
    if (!this.isConnected()) {
      throw new Error('PocketOption broker is not connected');
    }

    const requestId = ++this.requestCounter;
    const asset = this._toAsset(request.instrument);
    const action = request.direction === 'BUY' ? 'call' : 'put';

    const order = {
      asset,
      amount: request.positionSize,
      action,
      isDemo: this.isDemo ? 1 : 0,
      requestId,
      optionType: 100,
      time: request.duration,
    };

    this._send(`42["openOrder",${JSON.stringify(order)}]`);

    return new Promise<TradeResponse>((resolve, reject) => {
      // Timeout = trade duration + 45s grace window
      const timeoutMs = (request.duration + 45) * 1_000;
      const timeoutId = setTimeout(() => {
        this.pendingTrades.delete(requestId);
        reject(new Error(`Trade ${requestId} timed out waiting for result`));
      }, timeoutMs);

      this.pendingTrades.set(requestId, {
        resolve,
        reject,
        timeoutId,
        request,
      });
    });
  }

  async closeTrade(_tradeId: string): Promise<TradeResponse> {
    // Binary options auto-close at expiry — manual close not supported by PO
    throw new Error('Binary options close at expiry; manual close not supported');
  }

  async getBalance(): Promise<{ balance: number; equity: number; freeMargin: number }> {
    if (!this.isConnected()) {
      throw new Error('PocketOption broker is not connected');
    }
    this._send('42["getBalance"]');
    // Return last known balance immediately — update arrives async via 'updateBalance' event
    return { balance: this.balance, equity: this.balance, freeMargin: this.balance };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    if (!this.isConnected()) return [];
    this._send('42["getOpenOrders"]');
    return [];
  }

  // ─── WebSocket connection ─────────────────────────────────────

  private _openConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const connectTimer = setTimeout(() => {
        this._cleanupWs();
        reject(new Error('PocketOption connection timed out'));
      }, CONNECT_TIMEOUT_MS);

      try {
        this.ws = new WebSocket(PO_WS_URL, {
          headers: {
            Cookie: `ssid=${this.ssid}`,
            Origin: 'https://pocketoption.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
      } catch (err) {
        clearTimeout(connectTimer);
        reject(err);
        return;
      }

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        console.log('[PocketOption] WebSocket open — waiting for EIO handshake');
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        this._handleMessage(data.toString(), resolve, reject, connectTimer);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeout(connectTimer);
        console.log(`[PocketOption] WebSocket closed — code=${code} reason=${reason.toString()}`);
        this._connected = false;
        this._authenticated = false;
        this._clearTimers();
        this.emit('disconnected', { code, reason: reason.toString() });
        if (!this.destroyed) this._scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        clearTimeout(connectTimer);
        console.error('[PocketOption] WebSocket error:', err.message);
        this.emit('error', err);
        // reject only if not yet connected
        if (!this._authenticated) reject(err);
      });
    });
  }

  // ─── Protocol handling ────────────────────────────────────────

  private _handleMessage(
    msg: string,
    resolve?: (v: boolean) => void,
    reject?: (e: Error) => void,
    connectTimer?: NodeJS.Timeout,
  ): void {
    // EIO4 heartbeat
    if (msg === '2') {
      this._send('3');
      return;
    }

    // EIO4 initial handshake
    if (msg.startsWith('0')) {
      this._send('40');
      return;
    }

    // Socket.IO connected — send auth
    if (msg === '40') {
      const authPayload = JSON.stringify({ ssid: this.ssid, isDemo: this.isDemo ? 1 : 0 });
      this._send(`42["auth",${authPayload}]`);
      return;
    }

    // Socket.IO events
    if (msg.startsWith('42')) {
      let parsed: [string, any];
      try {
        parsed = JSON.parse(msg.slice(2));
      } catch {
        return;
      }
      const [event, data] = parsed;
      this._handleEvent(event, data, resolve, reject, connectTimer);
    }
  }

  private _handleEvent(
    event: string,
    data: any,
    resolve?: (v: boolean) => void,
    reject?: (e: Error) => void,
    connectTimer?: NodeJS.Timeout,
  ): void {
    switch (event) {
      // ── Auth success ──────────────────────────────────────────
      case 'successauth':
      case 'successLogin':
      case 'authorized': {
        clearTimeout(connectTimer);
        this._connected = true;
        this._authenticated = true;
        console.log('[PocketOption] Authenticated successfully');
        this._startPing();
        this.emit('connected', { isDemo: this.isDemo });
        resolve?.(true);
        break;
      }

      // ── Auth failure ─────────────────────────────────────────
      case 'failureauth':
      case 'failureLogin':
      case 'noauth':
      case 'unauthenticated': {
        clearTimeout(connectTimer);
        this._connected = false;
        this._authenticated = false;
        console.error('[PocketOption] Authentication failed — SSID expired or invalid');
        this.emit('ssid_expired');
        reject?.(new Error('SSID expired or invalid'));
        break;
      }

      // ── Balance update ────────────────────────────────────────
      case 'updateBalance': {
        // data shape: { uid, demoBalance, liveBalance } or { demo, live }
        const bal = this.isDemo
          ? (data?.demoBalance ?? data?.demo ?? this.balance)
          : (data?.liveBalance ?? data?.live ?? this.balance);
        this.balance = Number(bal) || 0;
        this.emit('balance', { balance: this.balance, equity: this.balance, freeMargin: this.balance });
        break;
      }

      // ── Trade result ──────────────────────────────────────────
      case 'updateOrder':
      case 'closeOrder':
      case 'tradeResult': {
        this._resolveTradeResult(data);
        // Also emit globally for audit / tracking
        this.emit('trade:result', data);
        break;
      }

      default:
        break;
    }
  }

  private _resolveTradeResult(data: any): void {
    // PO sends requestId back with the result
    const requestId: number | undefined = data?.requestId;
    if (requestId === undefined || !this.pendingTrades.has(requestId)) return;

    const pending = this.pendingTrades.get(requestId)!;
    clearTimeout(pending.timeoutId);
    this.pendingTrades.delete(requestId);

    const { request } = pending;
    const isWin: boolean = data?.win === 'win' || data?.result === 'win';
    const entryPrice: number = Number(data?.openPrice ?? request.entryPrice);
    const exitPrice: number = Number(data?.closePrice ?? entryPrice);
    const profit: number = Number(data?.profit ?? 0);
    const payoutRate = isWin && request.positionSize > 0 ? profit / request.positionSize : 0;

    const response: TradeResponse = {
      brokerId: String(data?.id ?? requestId),
      instrument: request.instrument,
      direction: request.direction,
      entryPrice,
      exitPrice,
      entryTime: data?.openTime
        ? new Date(Number(data.openTime) * 1_000).toISOString()
        : new Date().toISOString(),
      exitTime: data?.closeTime
        ? new Date(Number(data.closeTime) * 1_000).toISOString()
        : new Date().toISOString(),
      pnl: isWin ? profit : -request.positionSize,
      pnlPercent: isWin ? payoutRate * 100 : -100,
      isWin,
      payoutRate,
    };

    pending.resolve(response);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private _send(msg: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    }
  }

  /** EUR/USD → EURUSD_otc (OTC assets used on weekends; live uses EURUSD) */
  private _toAsset(instrument: string): string {
    return instrument.replace('/', '') + '_otc';
  }

  private _startPing(): void {
    this._clearTimers();
    // EIO4 expects client to respond to server pings ('2' → '3').
    // Also send keepalive every 20s to prevent idle timeout.
    this.pingTimer = setInterval(() => {
      this._send('2');
    }, 20_000);
  }

  private _clearTimers(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }

  private _cleanupWs(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.destroyed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[PocketOption] Max reconnect attempts reached — manual reconnect required');
      this.emit('reconnect_failed');
      return;
    }
    const delay = Math.min(
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_MS,
    );
    this.reconnectAttempts++;
    console.log(`[PocketOption] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this._openConnection();
        console.log('[PocketOption] Reconnected');
        this.emit('reconnected');
      } catch (err) {
        console.error('[PocketOption] Reconnect failed:', (err as Error).message);
      }
    }, delay);
  }
}
