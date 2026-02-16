import type { BrokerAdapter, TradeRequest, TradeResponse, BrokerPosition } from './broker.adapter.js';
import { PAYOUT_RATES } from '@nexus/shared';
import crypto from 'crypto';

export class MockBroker implements BrokerAdapter {
  name = 'mock';
  private connected = false;
  private balance = 10000;
  private positions: BrokerPosition[] = [];

  async connect(): Promise<boolean> {
    this.connected = true;
    return true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async placeTrade(request: TradeRequest): Promise<TradeResponse> {
    const brokerId = `MOCK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const entryTime = new Date().toISOString();

    // Simulate trade execution with slight directional bias
    // 60% chance of winning when going with signal direction
    const winProbability = 0.6;
    const isWin = Math.random() < winProbability;

    // Get payout rate based on duration
    const payoutRate = PAYOUT_RATES[request.duration] || 0.85;

    // Calculate price movement
    const pipSize = request.instrument.includes('JPY') ? 0.01 : 0.0001;
    const movement = (Math.random() * 20 + 5) * pipSize; // 5-25 pips

    let exitPrice: number;
    if (request.direction === 'BUY') {
      exitPrice = isWin
        ? request.entryPrice + movement
        : request.entryPrice - movement;
    } else {
      exitPrice = isWin
        ? request.entryPrice - movement
        : request.entryPrice + movement;
    }

    // Binary option P&L: win = stake * payout, loss = -stake
    const stake = (request.positionSize / 100) * this.balance;
    const pnl = isWin ? stake * payoutRate : -stake;
    const pnlPercent = isWin ? request.positionSize * payoutRate : -request.positionSize;

    this.balance += pnl;

    // Simulate trade duration
    const exitTime = new Date(Date.now() + request.duration * 1000).toISOString();

    return {
      brokerId,
      instrument: request.instrument,
      direction: request.direction,
      entryPrice: request.entryPrice,
      exitPrice: Math.round(exitPrice * 100000) / 100000,
      entryTime,
      exitTime,
      pnl: Math.round(pnl * 100) / 100,
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      isWin,
      payoutRate,
    };
  }

  async closeTrade(tradeId: string): Promise<TradeResponse> {
    // For binary options, trades auto-close at expiry
    return {
      brokerId: tradeId,
      instrument: 'EUR/USD',
      direction: 'BUY',
      entryPrice: 1.08,
      exitPrice: 1.08,
      entryTime: new Date().toISOString(),
      exitTime: new Date().toISOString(),
      pnl: 0,
      pnlPercent: 0,
      isWin: false,
      payoutRate: 0,
    };
  }

  async getBalance() {
    return {
      balance: this.balance,
      equity: this.balance,
      freeMargin: this.balance,
    };
  }

  async getPositions(): Promise<BrokerPosition[]> {
    return this.positions;
  }
}
