import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAlertStore } from '../store/useAlertStore';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

interface CrosshairAlertButtonProps {
  chartRef: React.RefObject<IChartApi | null>;
  priceSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
}

export const CrosshairAlertButton: React.FC<CrosshairAlertButtonProps> = ({ chartRef, priceSeriesRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [positionY, setPositionY] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  const openPanelWithPrice = useAlertStore(state => state.openPanelWithPrice);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!chartRef.current || !priceSeriesRef.current) return;

    const chart = chartRef.current;
    
    const crosshairMoveHandler = (param: any) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chart.timeScale().width() ||
        param.point.y < 0
      ) {
        setIsVisible(false);
        if (buttonRef.current) buttonRef.current.style.display = 'none';
        return;
      }

      if (priceSeriesRef.current) {
        const price = priceSeriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          setIsVisible(true);
          setPositionY(param.point.y);
          setCurrentPrice(price);
          
          if (buttonRef.current) {
            buttonRef.current.style.display = 'flex';
            buttonRef.current.style.top = `${param.point.y}px`;
          }
        }
      }
    };

    chart.subscribeCrosshairMove(crosshairMoveHandler);

    return () => {
      chart.unsubscribeCrosshairMove(crosshairMoveHandler);
    };
  }, [chartRef, priceSeriesRef]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPrice !== null) {
      openPanelWithPrice(currentPrice);
    }
  };

  return (
    <button
      ref={buttonRef}
      data-testid="crosshair-alert-btn"
      onClick={handleClick}
      style={{
        display: isVisible ? 'flex' : 'none',
        position: 'absolute',
        right: '50px', // Right before the Y-axis
        top: `${positionY}px`,
        transform: 'translateY(-50%)',
        width: '24px',
        height: '24px',
        padding: '2px',
        backgroundColor: '#2563eb', // blue-600
        color: 'white',
        borderRadius: '4px 0 0 4px',
        zIndex: 50,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none'
      }}
      title="Create Alert Here"
    >
      <Plus size={16} />
    </button>
  );
};
