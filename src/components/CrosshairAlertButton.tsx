import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAlertStore } from '../store/useAlertStore';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';

interface CrosshairAlertButtonProps {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.RefObject<IChartApi | null>;
  priceSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>;
}

export const CrosshairAlertButton: React.FC<CrosshairAlertButtonProps> = ({ chartContainerRef, chartRef, priceSeriesRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [positionY, setPositionY] = useState(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  
  const openPanelWithPrice = useAlertStore(state => state.openPanelWithPrice);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !priceSeriesRef.current) return;

    const container = chartContainerRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      // Mouse Y relative to the chart container
      const y = e.clientY - rect.top;
      const x = e.clientX - rect.left;

      // Only show if we are on the right side (Y-axis area, typically rightmost 60px)
      // or we just want to show it anywhere on hover? The requirement says:
      // "Hovering over the Y-axis of the chart reveals the plus symbol correctly aligned with the crosshair."
      // But we can also show it whenever the mouse is in the container.
      
      if (priceSeriesRef.current) {
        const price = priceSeriesRef.current.coordinateToPrice(y);
        setIsVisible(true);
        setPositionY(y);
        setCurrentPrice(price || 0); // fallback if null
        
        if (buttonRef.current) {
          buttonRef.current.style.display = 'flex';
          buttonRef.current.style.top = `${y}px`;
        }
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      if (buttonRef.current) buttonRef.current.style.display = 'none';
    };

    container.addEventListener('mousemove', handleMouseMove, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [chartContainerRef, priceSeriesRef]);

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
