import { sql } from '../db/client.js';
import { getSignalById, markSignalExecuted } from './signal.service.js';
import { getActiveRiskProfile } from './risk.service.js';
import { getMartingaleState, processTradeResult, computeDoubleDownSize } from './martingale.service.js';
import { MockBroker } from '../brokers/mock.broker.js';
import { broadcastTradeUpdate, broadcastMartingaleUpdate } from '../ws/socket.js';
import crypto from 'crypto';
import type { Server as SocketIOServer } from 'socket.io';

const broker = new MockBroker();

export async function executeSignalForUser(userId: string, signalId: string) {
  // 1. Get signal
  const signal = await getSignalById(signalId);
  if (!signal) return { success: false, error: 'Signal not found' };
  if (signal.status !== 'active') return { success: false, error: 'Signal no longer active' };

  // Block execution during PREPARE phase (before start_time)
  const startTime = new Date(signal.start_time).getTime();
  if (Date.now() < startTime) {
    return { success: false, error: 'Signal not yet active. Wait for the candle to open.' };
  }

  // 2. Get risk profile
  const riskProfile = await getActiveRiskProfile(userId);
  if (!riskProfile) return { success: false, error: 'No active risk profile' };

  // 3. Check martingale state
  const martState = await getMartingaleState(userId, signal.instrument);
  if (!martState.canTrade) {
    return { success: false, error: `Trading halted for ${signal.instrument} — both steps lost` };
  }

  // 4. Calculate position size (payout-based double-down)
  const baseRisk = Number(riskProfile.base_risk_percent);
  const payoutPercent = Number(signal.payout_percent);
  let positionSize: number;

  if (martState.currentStep === '0') {
    positionSize = baseRisk;
  } else {
    // Step 1: size to recover step-0 loss + profit
    positionSize = computeDoubleDownSize(baseRisk, payoutPercent);
  }
  // Cap at max exposure
  positionSize = Math.min(positionSize, Number(riskProfile.max_concurrent_exposure));

  // 5. Check total exposure
  const openTrades = await sql`
    SELECT COALESCE(SUM(position_size_percent), 0) as total
    FROM trades WHERE user_id = ${userId} AND exit_time IS NULL
  `;
  const currentExposure = Number(openTrades[0].total);
  if (currentExposure + positionSize > Number(riskProfile.max_concurrent_exposure)) {
    return { success: false, error: 'Would exceed maximum concurrent exposure' };
  }

  // 6. Execute via broker
  const tradeId = `TRD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const executionStart = Date.now();

  const brokerResult = await broker.placeTrade({
    instrument: signal.instrument,
    direction: signal.direction,
    entryPrice: Number(signal.strike_price),
    positionSize,
    duration: Number(signal.expiration_seconds),
  });

  const latency = Date.now() - executionStart;

  // 7. Record trade
  const isWin = brokerResult.pnl > 0;
  const [trade] = await sql`
    INSERT INTO trades (
      trade_id, signal_id, user_id, instrument, direction,
      martingale_step, strike_price, entry_time, expiration_seconds,
      exit_price, exit_time, payout_percent,
      position_size_percent, pnl_usd, pnl_percent,
      execution_latency_ms, result
    ) VALUES (
      ${tradeId}, ${signal.id}, ${userId}, ${signal.instrument}, ${signal.direction},
      ${martState.currentStep}, ${brokerResult.entryPrice}, ${brokerResult.entryTime},
      ${Number(signal.expiration_seconds)},
      ${brokerResult.exitPrice}, ${brokerResult.exitTime},
      ${payoutPercent},
      ${positionSize}, ${brokerResult.pnl},
      ${brokerResult.pnlPercent}, ${latency},
      ${isWin ? 'win' : 'loss'}
    )
    RETURNING *
  `;

  // 8. Update martingale state
  const martResult = await processTradeResult(
    userId,
    signal.instrument,
    isWin,
    trade.id,
    {
      martingale_enabled: riskProfile.martingale_enabled,
      daily_halt_losses: riskProfile.daily_halt_losses,
    }
  );

  // 9. Mark signal as executed
  await markSignalExecuted(signalId);

  // 10. Update daily stats
  await updateDailyStats(userId, isWin, Number(brokerResult.pnl), martResult.halted);

  // 11. Increment paper trade count
  await sql`
    UPDATE users SET paper_trade_count = paper_trade_count + 1 WHERE id = ${userId}
  `;

  return {
    success: true,
    data: {
      trade,
      martingale: {
        previous_step: martState.currentStep,
        new_step: martResult.newStep,
        halted: martResult.halted,
      },
    },
  };
}

async function updateDailyStats(userId: string, isWin: boolean, pnl: number, halted: boolean) {
  const existing = await sql`
    SELECT * FROM daily_stats WHERE user_id = ${userId} AND date = CURRENT_DATE
  `;

  if (existing.length === 0) {
    await sql`
      INSERT INTO daily_stats (user_id, date, starting_equity, ending_equity, total_executed, wins, losses, net_pnl, is_halted)
      VALUES (${userId}, CURRENT_DATE, 10000, ${10000 + pnl}, 1, ${isWin ? 1 : 0}, ${isWin ? 0 : 1}, ${pnl}, ${halted})
    `;
  } else {
    await sql`
      UPDATE daily_stats
      SET total_executed = total_executed + 1,
          wins = wins + ${isWin ? 1 : 0},
          losses = losses + ${isWin ? 0 : 1},
          net_pnl = net_pnl + ${pnl},
          ending_equity = ending_equity + ${pnl},
          is_halted = is_halted OR ${halted}
      WHERE user_id = ${userId} AND date = CURRENT_DATE
    `;
  }
}

// ─── Deferred Trade Tracking ─────────────────────────────────
export async function trackSignalForUser(userId: string, signalId: string, io: SocketIOServer | null) {
  // 1. Get signal
  const signal = await getSignalById(signalId);
  if (!signal) return { success: false, error: 'Signal not found' };
  if (signal.status !== 'active') return { success: false, error: 'Signal no longer active' };

  // 2. Allow tracking during final 5s of prep OR first 15s of live
  const startTime = new Date(signal.start_time).getTime();
  const now = Date.now();
  const timeToStart = startTime - now;
  const timeIntoLive = now - startTime;

  const isFinal5 = timeToStart > 0 && timeToStart <= 5000;
  const isLive = timeToStart <= 0 && now < startTime + signal.expiration_seconds * 1000;
  const isGracePeriod = isLive && timeIntoLive <= 15000;

  if (!isFinal5 && !isGracePeriod) {
    return { success: false, error: 'Trade entry window is closed' };
  }

  // 3. Get risk profile
  const riskProfile = await getActiveRiskProfile(userId);
  if (!riskProfile) return { success: false, error: 'No active risk profile' };

  // 4. Check martingale state
  const martState = await getMartingaleState(userId, signal.instrument);
  if (!martState.canTrade) {
    return { success: false, error: `Trading halted for ${signal.instrument} — both steps lost` };
  }

  // 5. Calculate position size
  const baseRisk = Number(riskProfile.base_risk_percent);
  const payoutPercent = Number(signal.payout_percent);
  let positionSize: number;

  if (martState.currentStep === '0') {
    positionSize = baseRisk;
  } else {
    positionSize = computeDoubleDownSize(baseRisk, payoutPercent);
  }
  positionSize = Math.min(positionSize, Number(riskProfile.max_concurrent_exposure));

  // 6. Check total exposure
  const openTrades = await sql`
    SELECT COALESCE(SUM(position_size_percent), 0) as total
    FROM trades WHERE user_id = ${userId} AND exit_time IS NULL
  `;
  const currentExposure = Number(openTrades[0].total);
  if (currentExposure + positionSize > Number(riskProfile.max_concurrent_exposure)) {
    return { success: false, error: 'Would exceed maximum concurrent exposure' };
  }

  // 7. Open trade with pending result (no exit_price, no result yet)
  const tradeId = `TRD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const entryTime = new Date().toISOString();

  const [trade] = await sql`
    INSERT INTO trades (
      trade_id, signal_id, user_id, instrument, direction,
      martingale_step, strike_price, entry_time, expiration_seconds,
      payout_percent, position_size_percent
    ) VALUES (
      ${tradeId}, ${signal.id}, ${userId}, ${signal.instrument}, ${signal.direction},
      ${martState.currentStep}, ${Number(signal.strike_price)}, ${entryTime},
      ${Number(signal.expiration_seconds)},
      ${payoutPercent}, ${positionSize}
    )
    RETURNING *
  `;

  // 8. Mark signal as executed and broadcast status change
  const [executedSignal] = await markSignalExecuted(signalId);
  if (io && executedSignal) {
    io.emit('signal:new', executedSignal); // reuse signal:new to upsert in store
  }

  // 9. Increment paper trade count
  await sql`
    UPDATE users SET paper_trade_count = paper_trade_count + 1 WHERE id = ${userId}
  `;

  // 10. Schedule deferred resolution at candle expiry
  const expiresAt = startTime + signal.expiration_seconds * 1000;
  const msUntilExpiry = Math.max(0, expiresAt - Date.now());

  setTimeout(async () => {
    try {
      // Resolve with MockBroker
      const brokerResult = await broker.placeTrade({
        instrument: signal.instrument,
        direction: signal.direction,
        entryPrice: Number(signal.strike_price),
        positionSize,
        duration: Number(signal.expiration_seconds),
      });

      const isWin = brokerResult.pnl > 0;

      // Update trade with resolution
      const [resolved] = await sql`
        UPDATE trades
        SET exit_price = ${brokerResult.exitPrice},
            exit_time = ${new Date().toISOString()},
            pnl_usd = ${brokerResult.pnl},
            pnl_percent = ${brokerResult.pnlPercent},
            result = ${isWin ? 'win' : 'loss'}
        WHERE id = ${trade.id}
        RETURNING *
      `;

      // Process martingale state
      const martResult = await processTradeResult(
        userId,
        signal.instrument,
        isWin,
        trade.id,
        {
          martingale_enabled: riskProfile.martingale_enabled,
          daily_halt_losses: riskProfile.daily_halt_losses,
        }
      );

      // Update daily stats
      await updateDailyStats(userId, isWin, Number(brokerResult.pnl), martResult.halted);

      // Broadcast trade result and martingale update
      if (io) {
        broadcastTradeUpdate(io, userId, resolved);

        const updatedMart = await getMartingaleState(userId, signal.instrument);
        broadcastMartingaleUpdate(io, userId, {
          instrument: signal.instrument,
          current_step: updatedMart.currentStep,
          consecutive_losses: updatedMart.consecutiveLosses,
        });
      }

      // Auto-Martingale: if loss at step 0 and martingale enabled, generate step 1 signal
      if (!isWin && martState.currentStep === '0' && riskProfile.martingale_enabled && io) {
        const martSignalId = `NXS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${signal.instrument.replace('/', '-')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}-M1`;
        const nextMinute = Math.ceil(Date.now() / 60000) * 60000;
        const martPositionSize = computeDoubleDownSize(baseRisk, payoutPercent);

        const strategies = Array.isArray(signal.confirming_strategies)
          ? signal.confirming_strategies
          : JSON.parse(signal.confirming_strategies);

        const martStrategies = [...strategies];
        if (!martStrategies.includes('MARTINGALE')) {
          martStrategies.push('MARTINGALE');
        }

        const meta = typeof signal.meta === 'string' ? JSON.parse(signal.meta) : (signal.meta || {});

        const [martSignal] = await sql`
          INSERT INTO signals (
            signal_id, start_time, instrument, direction, signal_type, confidence,
            confirming_strategies, strike_price, expiration_seconds,
            payout_percent, position_size_percent, martingale_step, meta, status
          ) VALUES (
            ${martSignalId}, ${new Date(nextMinute).toISOString()}, ${signal.instrument},
            ${signal.direction}, ${signal.signal_type}, ${signal.confidence},
            ${JSON.stringify(martStrategies)},
            ${Number(signal.strike_price)}, ${signal.expiration_seconds},
            ${payoutPercent}, ${martPositionSize},
            ${'1'}, ${JSON.stringify(meta)}, 'active'
          )
          RETURNING *
        `;

        io.emit('signal:new', martSignal);
      }
    } catch (err) {
      console.error(`Deferred resolution failed for trade ${trade.id}:`, err);
    }
  }, msUntilExpiry);

  return {
    success: true,
    data: { trade },
  };
}
