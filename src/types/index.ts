import React from 'react';
import type { IChartApi, ISeriesApi, Time, LogicalRange } from 'lightweight-charts';

// --- Market Data ---

export interface HistoryPrependState {
  oldFirstTime: number | null;
  oldLogicalRange: LogicalRange | null;
}

/** Raw 1-minute bar from the database */
export interface RawBar {
  time: string;          // "2024-01-15 14:30:00" (UTC)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  session: 'RTH' | 'PRE' | 'POST' | string;
}

/** Capital.com API Candle response shape */
export interface CapitalCandle {
  snapshotTime: string;
  snapshotTimeUTC?: string;
  openPrice: { bid: number; ask: number };
  closePrice: { bid: number; ask: number };
  highPrice: { bid: number; ask: number };
  lowPrice: { bid: number; ask: number };
  lastTradedVolume?: number;
}

/** Capital.com WebSocket tick update shape */
export interface CapitalTick {
  epic: string;
  bid: number;
  ask: number;
  timestamp: number;
}

/** Capital.com API resolutions */
export type MarketResolution = 'MINUTE' | 'MINUTE_5' | 'MINUTE_15' | 'MINUTE_30' | 'HOUR' | 'DAY';

/** Capital.com Market Search Result */
export interface MarketSearchResult {
  epic: string;
  instrumentName: string;
  instrumentType: string;
}

/** Resampled OHLCV bar (same shape, but time may be bucketed) */
export type ChartBar = RawBar;

/** Formatted bar ready for lightweight-charts (unix timestamp) */
export interface FormattedBar {
  time: number;   // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// --- Timeframes ---

export type Timeframe = '1min' | '5min' | '15min' | '30min' | '1H' | '1D';

export const TF_MINUTES: Record<Timeframe, number> = {
  '1min': 1,
  '5min': 5,
  '15min': 15,
  '30min': 30,
  '1H': 60,
  '1D': 1440,
};

// --- Trades ---

export type TradeType = 'long' | 'short';

export interface ActiveTrade {
  type: TradeType;
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  size: number;
  entryTime: string;
}

// --- Drawings ---

export interface RayDrawing {
  price: number;
  time: Time;
}

export interface RectPoint {
  price: number;
  time: Time;
}

export interface RectDrawing {
  p1: RectPoint;
  p2: RectPoint;
}

export interface TickerDrawings {
  rays: RayDrawing[];
  rects: RectDrawing[];
}

export type AllDrawings = Record<string, TickerDrawings>;

// --- Group Colors ---

export type GroupColor = 'red' | 'blue' | 'green' | 'yellow' | 'none';

export const BORDER_COLORS: Record<Exclude<GroupColor, 'none'>, string> = {
  red: '#ef5350',
  blue: '#42a5f5',
  green: '#26a69a',
  yellow: '#ffca28',
};

// --- Keyboard Action ---

export type KeyboardActionType = 'timeframe' | 'ticker' | null;

export interface KeyboardAction {
  active: boolean;
  type: KeyboardActionType;
  value: string;
}

// --- Draw Mode ---

export type DrawType = 'ray' | 'rect';

// --- Chart Unit Props ---

export interface ChartUnitProps {
  id: number;
  isSelected?: boolean;
  onSelect?: () => void;
  initialTicker: string;
  initialTf: Timeframe;
  initialEth: boolean;
  onToggleMaximize: () => void;
  isMaximized: boolean;
  allDrawings: AllDrawings;
  onUpdateDrawings: (ticker: string, type: 'rays' | 'rects', items: RayDrawing[] | RectDrawing[]) => void;
  onTimeframeChange: (id: number, tf: Timeframe) => void;
  groupColor: GroupColor;
  groupTicker?: string;
  onGroupChange?: (color: GroupColor) => void;
  onTickerChange?: (ticker: string) => void;
  style?: React.CSSProperties;
}

// --- Chart Refs (for useChartLifecycle) ---

export interface ChartTarget {
  useMediaCoordinateSpace(callback: (scope: ChartScope) => void): void;
}

export interface ChartScope {
  context: CanvasRenderingContext2D;
  mediaSize: {
    width: number;
    height: number;
  };
}

export interface ChartRefs {
  chartRef: React.MutableRefObject<IChartApi | null>;
  priceSeriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  volumeSeriesRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>;
  chartContainerRef: React.RefObject<HTMLDivElement>;
}
