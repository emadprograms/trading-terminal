import React from 'react';
import type { 
    IChartApi, 
    ISeriesApi, 
    ISeriesPrimitive, 
    ISeriesPrimitivePaneRenderer, 
    ISeriesPrimitivePaneView,
    Time,
    SeriesPrimitivePaneViewZOrder,
    SeriesAttachedParameter,
    Coordinate
} from 'lightweight-charts';
import type { OrderDirection } from '../types/trade';

export interface ChartMarker {
    id: string;
    epic: string;
    price: number;
    direction: OrderDirection;
    size: number;
    type: 'POSITION' | 'ORDER';
    label?: string;
    isDashed?: boolean;
    parentPrice?: number;
    hasSL?: boolean;
    hasTP?: boolean;
}

interface TradeRenderItem {
    y: Coordinate;
    direction: OrderDirection;
    id: string;
    isDashed?: boolean;
    parentY?: Coordinate | null;
}

class TradeRenderer implements ISeriesPrimitivePaneRenderer {
    _items: TradeRenderItem[];
    _badgeRefs: Map<string, React.RefObject<HTMLDivElement | null>>;
    _hoveredId: string | null;

    constructor(items: TradeRenderItem[], badgeRefs: Map<string, React.RefObject<HTMLDivElement | null>>, hoveredId: string | null) {
        this._items = items;
        this._badgeRefs = badgeRefs;
        this._hoveredId = hoveredId;
    }

    draw(target: { useMediaCoordinateSpace: (callback: (scope: any) => void) => void }) {
        try {
            target.useMediaCoordinateSpace((scope: any) => {
                const ctx = scope.context;
                if (!this._items.length) return;

                const rightEdge = scope.mediaSize.width;
                const canvasRect = scope.context.canvas.getBoundingClientRect();

                ctx.save();
                ctx.globalAlpha = 0.8;

                this._items.forEach(item => {
                    const { y, direction, id } = item;
                    if (y === null) return;

                    let color = direction === 'BUY' ? '#2962ff' : '#f23645';
                    if (item.isDashed || item.id.endsWith('_SL')) { 
                        color = '#facc15'; // solid yellow for SL
                    }
                    if (item.id.endsWith('_TP')) {
                        color = '#089981'; // solid green for TP
                    }
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([]); // always solid

                    let badgeStart = rightEdge;
                    let badgeEnd = rightEdge;
                    const gapPadding = 0;

                    const ref = this._badgeRefs.get(id);
                    if (ref && ref.current) {
                        const badgeRect = ref.current.getBoundingClientRect();
                        badgeStart = badgeRect.left - canvasRect.left - gapPadding;
                        badgeEnd = badgeRect.right - canvasRect.left + gapPadding;
                    }

                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(Math.max(0, badgeStart), y);
                    ctx.stroke();

                    if (badgeEnd < rightEdge) {
                        ctx.beginPath();
                        ctx.moveTo(badgeEnd, y);
                        ctx.lineTo(rightEdge, y);
                        ctx.stroke();
                    }

                    // Only draw connecting line if this specific badge is hovered
                    if (this._hoveredId === id && item.parentY !== undefined && item.parentY !== null) {
                        const lineX = badgeStart - 12;
                        ctx.save();
                        ctx.strokeStyle = color; // use the badge's color (yellow for SL)
                        ctx.fillStyle = '#1e293b'; // center of bubble matches chart bg
                        ctx.lineWidth = 1;
                        ctx.setLineDash([]); // solid line
                        
                        // Vertical line
                        ctx.beginPath();
                        ctx.moveTo(lineX, item.parentY);
                        ctx.lineTo(lineX, y);
                        ctx.stroke();

                        // Bubble at parent price
                        ctx.beginPath();
                        ctx.arc(lineX, item.parentY, 3, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();

                        // Bubble at SL/TP price
                        ctx.beginPath();
                        ctx.arc(lineX, y, 3, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();

                        ctx.restore();
                    }
                });

                ctx.setLineDash([]);
                ctx.restore();
            });
        } catch (err) {
            console.error('TradeRenderer draw error:', err);
        }
    }
}

class TradePaneView implements ISeriesPrimitivePaneView {
    _plugin: TradePlugin;

    constructor(plugin: TradePlugin) {
        this._plugin = plugin;
    }

    zOrder(): SeriesPrimitivePaneViewZOrder {
        return 'top';
    }

    renderer(): ISeriesPrimitivePaneRenderer {
        try {
            const items = this._plugin._getViewData();
            return new TradeRenderer(items, this._plugin._badgeRefs, this._plugin._hoveredId);
        } catch(e) {
            console.error('TradePaneView renderer error:', e);
            return new TradeRenderer([], new Map(), null);
        }
    }
}

export class TradePlugin implements ISeriesPrimitive<Time> {
    _chart: IChartApi | null;
    _series: ISeriesApi<"Candlestick"> | null;
    _paneViews: TradePaneView[];
    _requestUpdate: () => void;
    _items: ChartMarker[];
    _badgeRefs: Map<string, React.RefObject<HTMLDivElement | null>>;
    _hoveredId: string | null;

    constructor() {
        this._chart = null;
        this._series = null;
        this._paneViews = [new TradePaneView(this)];
        this._requestUpdate = () => {};
        this._items = [];
        this._badgeRefs = new Map();
        this._hoveredId = null;
    }

    setItems(items: ChartMarker[]) {
        this._items = items;
        this._requestUpdate();
        // Force a second update to ensure React has rendered the badges and getBoundingClientRect is accurate
        setTimeout(() => this._requestUpdate(), 0);
    }

    setHoveredId(id: string | null) {
        if (this._hoveredId !== id) {
            this._hoveredId = id;
            this._requestUpdate();
        }
    }

    registerBadgeRef(id: string, ref: React.RefObject<HTMLDivElement | null>) {
        this._badgeRefs.set(id, ref);
        this._requestUpdate();
    }

    attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time, "Candlestick">) {
        this._chart = chart as IChartApi;
        this._series = series;
        this._requestUpdate = requestUpdate;
    }

    detached() {
        this._chart = null;
        this._series = null;
    }

    updateAllViews() {
        this._requestUpdate();
    }

    paneViews(): readonly ISeriesPrimitivePaneView[] {
        return this._paneViews;
    }

    _getViewData(): TradeRenderItem[] {
        try {
            if (!this._items.length || !this._series) {
                return [];
            }
            return this._items.map(item => {
                const y = item.price ? this._series!.priceToCoordinate(item.price) : null;
                const parentY = item.parentPrice ? this._series!.priceToCoordinate(item.parentPrice) : null;
                
                const ref = this._badgeRefs.get(item.id);
                if (ref && ref.current) {
                    if (y === null) {
                        ref.current.style.display = 'none';
                    } else {
                        ref.current.style.display = 'flex';
                        ref.current.style.top = `${y}px`;
                    }
                }

                return {
                    y: y as Coordinate,
                    direction: item.direction,
                    id: item.id,
                    isDashed: item.isDashed,
                    parentY: parentY as Coordinate | null
                };
            }).filter((item): item is TradeRenderItem => item !== null && item.y !== null);
        } catch(e) {
            console.error('TradePlugin _getViewData error:', e);
            return [];
        }
    }
}

