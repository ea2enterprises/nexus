import type { BrokerAdapter, TradeRequest, TradeResponse, BrokerPosition } from './broker.adapter.js';

/**
 * Pocket Option broker adapter — placeholder for future implementation.
 * Requires Pocket Option API credentials and WebSocket connection.
 */
export class PocketOptionBroker implements BrokerAdapter {
  name = 'pocket_option';
  private connected = false;

  async connect(): Promise<boolean> {
    // TODO: Implement Pocket Option WebSocket connection
    throw new Error('Pocket Option broker not yet implemented. Use mock broker for development.');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async placeTrade(_request: TradeRequest): Promise<TradeResponse> {
    throw new Error('Not implemented');
  }

  async closeTrade(_tradeId: string): Promise<TradeResponse> {
    throw new Error('Not implemented');
  }

  async getBalance() {
    throw new Error('Not implemented');
  }

  async getPositions(): Promise<BrokerPosition[]> {
    throw new Error('Not implemented');
  }
}
