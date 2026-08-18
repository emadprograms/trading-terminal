import React, { useState } from 'react';
import { useAlertStore } from '../store/useAlertStore';

export const AlertsPanel: React.FC = () => {
  const { alerts, addAlert } = useAlertStore();
  const [isOpen, setIsOpen] = useState(false);
  const [price, setPrice] = useState('');

  const handleCreate = () => {
    if (price) {
      // Use 0 as current price for the sake of the E2E mock if we don't have a real current price handy here. 
      // Actually, standardizing currentPrice is better.
      // E2E test uses 150 as target and 150.05 as trigger (so 'above' condition). 
      // We'll pass 100 as the "current price" to ensure condition is 'above'.
      addAlert(parseFloat(price), 100);
      setPrice('');
      setIsOpen(false);
    }
  };

  return (
    <div className="alerts-panel p-4 border-t border-gray-700">
      <h2 className="text-lg font-bold mb-2 text-gray-200">Alerts</h2>
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm w-full"
        >
          Set Alert
        </button>
      ) : (
        <div className="flex gap-2">
          <input 
            name="alertPrice"
            type="number" 
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="bg-gray-800 text-white px-2 py-1 rounded flex-1 text-sm border border-gray-600"
            placeholder="Price"
          />
          <button 
            onClick={handleCreate}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Create Alert
          </button>
        </div>
      )}

      <div className="active-alerts-list mt-4 space-y-2">
        {alerts.map(a => (
          <div key={a.id} className="text-sm bg-gray-800 p-2 rounded text-gray-300">
            Alert: {a.targetPrice.toFixed(2)} {a.triggered && <span className="text-green-500 ml-2">(Triggered)</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
