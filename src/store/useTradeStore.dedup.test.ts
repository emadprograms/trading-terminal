import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTradeStore } from './useTradeStore';
import { tradeApi } from '../services/trade';

vi.mock('../services/trade', () => ({
  tradeApi: {
    fetchPositions: vi.fn(),
    fetchWorkingOrders: vi.fn(),
    fetchActivityHistory: vi.fn(),
  },
}));

vi.mock('./usePriceStore', () => ({
  usePriceStore: {
    getState: () => ({ prices: {} })
  }
}));

describe('useTradeStore - Execution Dedup (phantom markers fix)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useTradeStore.setState({ executions: [], positions: [], pendingOrders: {} });
  });

  it('syncPositions should NOT create ENTRY executions', async () => {
    (tradeApi.fetchPositions as any).mockResolvedValue([
      {
        position: {
          dealId: 'DEAL-1',
          size: 10,
          direction: 'BUY',
          level: 250.5,
          createdDate: '2024-08-12T13:30:00',
        },
        market: { epic: 'TSLA' },
      },
    ]);
    (tradeApi.fetchWorkingOrders as any).mockResolvedValue([]);

    await useTradeStore.getState().syncPositions();

    const state = useTradeStore.getState();
    // Position should be added
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].dealId).toBe('DEAL-1');
    // But NO execution should be created — syncExecutions is the single source of truth
    expect(state.executions).toHaveLength(0);
  });

  it('syncExecutions should be the single source of truth for ENTRY markers', async () => {
    (tradeApi.fetchActivityHistory as any).mockResolvedValue([
      {
        dealId: 'DEAL-1',
        epic: 'TSLA',
        type: 'POSITION',
        status: 'OPENED',
        dateUTC: '2024-08-12T13:30:00',
        details: {
          direction: 'BUY',
          size: 10,
          level: 250.5,
        },
      },
    ]);

    await useTradeStore.getState().syncExecutions(1);

    const state = useTradeStore.getState();
    expect(state.executions).toHaveLength(1);
    expect(state.executions[0].dealId).toBe('DEAL-1');
    expect(state.executions[0].action).toBe('ENTRY');
    expect(state.executions[0].price).toBe(250.5);
    expect(state.executions[0].direction).toBe('BUY');
    // Timestamp should be UTC (13:30 UTC = 1723469400000)
    expect(state.executions[0].timestamp).toBe(1723469400000);
  });

  it('calling syncPositions AND syncExecutions for the same trade produces exactly ONE execution', async () => {
    // Mock both APIs returning data for the same trade
    (tradeApi.fetchPositions as any).mockResolvedValue([
      {
        position: {
          dealId: 'DEAL-1',
          size: 10,
          direction: 'BUY',
          level: 250.5,
          createdDate: '2024-08-12T13:30:00',
        },
        market: { epic: 'TSLA' },
      },
    ]);
    (tradeApi.fetchWorkingOrders as any).mockResolvedValue([]);
    (tradeApi.fetchActivityHistory as any).mockResolvedValue([
      {
        dealId: 'DEAL-1',
        epic: 'TSLA',
        type: 'POSITION',
        status: 'OPENED',
        dateUTC: '2024-08-12T13:30:00',
        details: {
          direction: 'BUY',
          size: 10,
          level: 250.5,
        },
      },
    ]);

    // Call both syncs — this is exactly what happens in useSession.ts
    await useTradeStore.getState().syncPositions();
    await useTradeStore.getState().syncExecutions(1);

    const state = useTradeStore.getState();
    // MUST be exactly 1 execution, not 2
    const deal1Execs = state.executions.filter(e => e.dealId === 'DEAL-1');
    expect(deal1Execs).toHaveLength(1);
    expect(deal1Execs[0].action).toBe('ENTRY');
  });

  it('addPosition should NOT create ENTRY executions', () => {
    useTradeStore.getState().addPosition({
      dealId: 'DEAL-2',
      epic: 'TSLA',
      size: 5,
      direction: 'BUY',
      entryPrice: 200,
      timestamp: Date.now(),
    });

    const state = useTradeStore.getState();
    // Position should be added
    expect(state.positions).toHaveLength(1);
    expect(state.positions[0].dealId).toBe('DEAL-2');
    // But NO execution should be created
    expect(state.executions).toHaveLength(0);
  });

  it('syncExecutions deduplicates by dealId+action, not by id', async () => {
    // Seed with an execution that has the OLD id format (from syncPositions/addPosition)
    useTradeStore.setState({
      executions: [
        {
          id: 'DEAL-1_ENTRY_1723469400000',
          dealId: 'DEAL-1',
          epic: 'TSLA',
          size: 10,
          price: 250.5,
          direction: 'BUY',
          timestamp: 1723469400000,
          action: 'ENTRY' as const,
        },
      ],
      positions: [],
      pendingOrders: {},
    });

    // syncExecutions returns the SAME trade but with a DIFFERENT id format
    (tradeApi.fetchActivityHistory as any).mockResolvedValue([
      {
        dealId: 'DEAL-1',
        epic: 'TSLA',
        type: 'POSITION',
        status: 'OPENED',
        dateUTC: '2024-08-12T13:30:00',
        details: {
          direction: 'BUY',
          size: 10,
          level: 250.5,
        },
      },
    ]);

    await useTradeStore.getState().syncExecutions(1);

    const state = useTradeStore.getState();
    // The duplicate should be collapsed to exactly 1
    const deal1Execs = state.executions.filter(e => e.dealId === 'DEAL-1');
    expect(deal1Execs).toHaveLength(1);
    // The surviving execution should come from syncExecutions (authoritative)
    expect(deal1Execs[0].id).toBe('DEAL-1_BUY_1723469400000');
  });

  it('multiple trades produce exactly one execution each', async () => {
    (tradeApi.fetchPositions as any).mockResolvedValue([
      {
        position: { dealId: 'DEAL-A', size: 5, direction: 'BUY', level: 100, createdDate: '2024-08-12T14:00:00' },
        market: { epic: 'AAPL' },
      },
      {
        position: { dealId: 'DEAL-B', size: 3, direction: 'SELL', level: 200, createdDate: '2024-08-12T14:30:00' },
        market: { epic: 'TSLA' },
      },
    ]);
    (tradeApi.fetchWorkingOrders as any).mockResolvedValue([]);
    (tradeApi.fetchActivityHistory as any).mockResolvedValue([
      {
        dealId: 'DEAL-A', epic: 'AAPL', type: 'POSITION', status: 'OPENED',
        dateUTC: '2024-08-12T14:00:00',
        details: { direction: 'BUY', size: 5, level: 100 },
      },
      {
        dealId: 'DEAL-B', epic: 'TSLA', type: 'POSITION', status: 'OPENED',
        dateUTC: '2024-08-12T14:30:00',
        details: { direction: 'SELL', size: 3, level: 200 },
      },
    ]);

    await useTradeStore.getState().syncPositions();
    await useTradeStore.getState().syncExecutions(1);

    const state = useTradeStore.getState();
    expect(state.executions).toHaveLength(2);
    expect(state.executions.filter(e => e.dealId === 'DEAL-A')).toHaveLength(1);
    expect(state.executions.filter(e => e.dealId === 'DEAL-B')).toHaveLength(1);
  });

  it('ACCEPTED status activities are still filtered out', async () => {
    (tradeApi.fetchActivityHistory as any).mockResolvedValue([
      {
        dealId: 'DEAL-PENDING',
        epic: 'TSLA',
        type: 'WORKING_ORDER',
        status: 'ACCEPTED', // Pending, not filled
        dateUTC: '2024-08-12T13:30:00',
        details: { direction: 'BUY', size: 10, level: 250.5 },
      },
    ]);

    await useTradeStore.getState().syncExecutions(1);

    const state = useTradeStore.getState();
    expect(state.executions).toHaveLength(0);
  });
});
