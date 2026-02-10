export interface TradeRequest {
  instrument: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  positionSize: number;
  duration: number; // seconds for binary options
  stopLoss?: number;
  takeProfit?: number;
}

export interface TradeResponse {
  brokerId: string;
  instrument: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnl: number;
  pnlPips: number;
  pnlPercent: number;
  isWin: boolean;
  payoutRate: number;
}

export interface BrokerPosition {
  id: string;
  instrument: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  openedAt: string;
}

export interface BrokerAdapter {
  name: string;
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  placeTrade(request: TradeRequest): Promise<TradeResponse>;
  closeTrade(tradeId: string): Promise<TradeResponse>;
  getBalance(): Promise<{ balance: number; equity: number; freeMargin: number }>;
  getPositions(): Promise<BrokerPosition[]>;
  isConnected(): boolean;
}
