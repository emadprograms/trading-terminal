import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { DrawType, KeyboardAction, RayDrawing, RectDrawing, RectPoint } from '../types';
import { useTradeStore } from '../store/useTradeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePriceStore } from '../store/usePriceStore';
import { toast } from 'sonner';

interface UseKeyboardShortcutsParams {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  onUpdateDrawings: (ticker: string, type: 'rays' | 'rects', items: RayDrawing[] | RectDrawing[]) => void;
  ticker: string;
  setShowEth: React.Dispatch<React.SetStateAction<boolean>>;
  isSelected: boolean;
  onNavigateWatchlist: (direction: 1 | -1) => void;
}

export function useKeyboardShortcuts({
  chartContainerRef,
  onUpdateDrawings,
  ticker,
  setShowEth,
  isSelected,
  onNavigateWatchlist,
}: UseKeyboardShortcutsParams) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawType, setDrawType] = useState<DrawType>('ray');
  const [rectAnchor, setRectAnchor] = useState<RectPoint | null>(null);
  const [ghostPoint, setGhostPoint] = useState<RectPoint | null>(null);
  const [keyboardAction, setKeyboardAction] = useState<KeyboardAction>({ active: false, type: null, value: '' });

  const lastCtrlPressRef = useRef<number>(0);
  const lastAltPressRef = useRef<number>(0);
  const lastShiftPressRef = useRef<number>(0);

  const keyboardInputRef = useRef<HTMLInputElement>(null);
  const keyboardActionRef = useRef(keyboardAction);

  const updateKeyboardAction = useCallback((newState: Partial<KeyboardAction>) => {
    const merged = { ...keyboardActionRef.current, ...newState } as KeyboardAction;
    keyboardActionRef.current = merged;
    setKeyboardAction(merged);
  }, []);

  useEffect(() => {
    if (keyboardAction.active && keyboardInputRef.current) {
      keyboardInputRef.current.focus();
    }
  }, [keyboardAction.active]);

  const currentTickerRef = useRef(ticker);
  useEffect(() => {
    currentTickerRef.current = ticker;
  }, [ticker]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const isInput = e.target && ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT' || (e.target as HTMLElement).tagName === 'TEXTAREA');
      const keyLowerForShortcut = e.key.toLowerCase();
      const isTradeShortcutKey = e.code === 'KeyQ' || e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || ['q','w','a','s'].includes(keyLowerForShortcut);
      const isTradeShortcut = e.altKey && isTradeShortcutKey;

      if (isInput && !isTradeShortcut) return;

      const container = chartContainerRef.current;
      if (!container) return;
      const isHovered = container.matches(':hover') || container.contains(document.activeElement);
      if (!isHovered && !isSelected && !keyboardActionRef.current.active) return;

      const isAltKeyOnly = e.key === 'Alt';
      const isCtrlKeyOnly = e.key === 'Control';
      const DOUBLE_PRESS_DELAY = 400;

      if (isCtrlKeyOnly) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastCtrlPressRef.current < DOUBLE_PRESS_DELAY) {
          useTradeStore.getState().flattenSymbol(currentTickerRef.current);
          lastCtrlPressRef.current = 0;
        } else {
          lastCtrlPressRef.current = now;
        }
        return;
      }

      if (isAltKeyOnly) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastAltPressRef.current < DOUBLE_PRESS_DELAY) {
          useTradeStore.getState().flattenHalfSymbol(currentTickerRef.current);
          lastAltPressRef.current = 0;
        } else {
          lastAltPressRef.current = now;
        }
        return;
      }

      const isShiftKeyOnly = e.key === 'Shift';
      if (isShiftKeyOnly) {
        e.preventDefault();
        const now = Date.now();
        if (now - lastShiftPressRef.current < DOUBLE_PRESS_DELAY) {
          useTradeStore.getState().closeClosestPosition(currentTickerRef.current);
          lastShiftPressRef.current = 0;
        } else {
          lastShiftPressRef.current = now;
        }
        return;
      }

      if (e.altKey || e.ctrlKey) {
        const keyLower = e.key.toLowerCase();

        if (e.altKey) {
          const isKeyQ = e.code === 'KeyQ' || keyLower === 'q';
          const isKeyW = e.code === 'KeyW' || keyLower === 'w';
          const isKeyA = e.code === 'KeyA' || keyLower === 'a';
          const isKeyS = e.code === 'KeyS' || keyLower === 's';

          if ((isKeyQ || isKeyW || isKeyA || isKeyS)) {
            e.preventDefault();
            
            const ticker = currentTickerRef.current;
            const settings = useSettingsStore.getState().getOrderSettings(ticker);
            const isFullSize = isKeyQ || isKeyA;
            const size = isFullSize ? settings.tradeSize : settings.tradeSize / 2;
            
            if (size <= 0) {
              toast.error('Invalid trade size');
              return;
            }

            const priceData = usePriceStore.getState().prices[ticker];
            const direction = (isKeyQ || isKeyW) ? 'BUY' : 'SELL';
            
            const stopMultiplier = e.shiftKey ? 2 : 1;
            const stopDistance = settings.stopDistance ? settings.stopDistance * stopMultiplier : undefined;
            
            const promise = useTradeStore.getState().placeOrder({
              epic: ticker,
              size,
              direction,
              type: 'MARKET',
              stopDistance,
              guaranteedStop: settings.guaranteedStop,
              bid: priceData?.bid,
              ofr: priceData?.ask
            });
            toast.promise(promise, {
              loading: `Placing ${direction} ${size}...`,
              success: 'Order Submitted',
              error: (err) => err.message || 'Placement Failed'
            });
            return;
          }
        }

        const isKeyJ = e.code === 'KeyJ' || e.keyCode === 74 || keyLower === 'j' || keyLower === '∆';
        const isKeyE = e.code === 'KeyE' || e.keyCode === 69 || keyLower === 'e' || keyLower === '´';
        const isKeyR = e.code === 'KeyR' || e.keyCode === 82 || keyLower === 'r' || keyLower === '‰';

        if (isKeyJ && !e.shiftKey) {
          e.preventDefault();
          setDrawType('ray');
          setIsDrawingMode(prev => !prev || drawType !== 'ray');
          setRectAnchor(null);
        }
        if (isKeyE && e.shiftKey) {
          e.preventDefault();
          setShowEth(prev => !prev);
        }
        if (isKeyR && e.shiftKey) {
          e.preventDefault();
          setDrawType('rect');
          setIsDrawingMode(prev => !prev || drawType !== 'rect');
          setRectAnchor(null);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (keyboardActionRef.current.active) {
          updateKeyboardAction({ active: false, type: null, value: '' });
          return;
        }
        setIsDrawingMode(false);
        setRectAnchor(null);
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (!keyboardActionRef.current.active) {
          e.preventDefault();
          onNavigateWatchlist(e.shiftKey ? -1 : 1);
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (keyboardActionRef.current.active) {
          updateKeyboardAction({ value: keyboardActionRef.current.value.slice(0, -1) });
          return;
        }
        onUpdateDrawings(currentTickerRef.current, 'rays', []);
        onUpdateDrawings(currentTickerRef.current, 'rects', []);
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (keyboardActionRef.current.active) {
          // If already active but input not yet focused, append to value
          updateKeyboardAction({ value: (keyboardActionRef.current.value + e.key).toUpperCase() });
          return;
        }

        const isNum = /^[0-9]$/.test(e.key);
        const isLetter = /^[a-zA-Z]$/.test(e.key);

        if (isNum) {
          e.preventDefault();
          updateKeyboardAction({ active: true, type: 'timeframe', value: e.key });
        } else if (isLetter) {
          e.preventDefault();
          updateKeyboardAction({ active: true, type: 'ticker', value: e.key.toUpperCase() });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [chartContainerRef, drawType, onUpdateDrawings, setShowEth, updateKeyboardAction, isSelected, onNavigateWatchlist]);

  return {
    isDrawingMode,
    setIsDrawingMode,
    drawType,
    setDrawType,
    rectAnchor,
    setRectAnchor,
    ghostPoint,
    setGhostPoint,
    keyboardAction,
    updateKeyboardAction,
    keyboardInputRef,
  };
}
