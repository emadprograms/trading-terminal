import { create } from 'zustand';

export type AlertCondition = 'above' | 'below';

export interface Alert {
  id: string;
  epic: string;
  targetPrice: number;
  condition: AlertCondition;
  triggered: boolean;
  createdAt: number;
}

interface AlertStore {
  alerts: Alert[];
  addAlert: (epic: string, targetPrice: number, currentPrice: number) => void;
  removeAlert: (id: string) => void;
  evaluatePrice: (epic: string, currentPrice: number) => void;
  isPanelOpen: boolean;
  prefilledPrice: number | null;
  openPanelWithPrice: (price: number) => void;
  closePanel: () => void;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  isPanelOpen: false,
  prefilledPrice: null,
  
  openPanelWithPrice: (price: number) => {
    set({ isPanelOpen: true, prefilledPrice: price });
  },
  
  closePanel: () => {
    set({ isPanelOpen: false, prefilledPrice: null });
  },

  addAlert: (epic: string, targetPrice: number, currentPrice: number) => {
    const condition: AlertCondition = currentPrice > targetPrice ? 'below' : 'above';
    const newAlert: Alert = {
      id: Math.random().toString(36).substring(7),
      epic,
      targetPrice,
      condition,
      triggered: false,
      createdAt: Date.now(),
    };
    set((state) => ({ alerts: [...state.alerts, newAlert] }));
  },

  removeAlert: (id: string) => {
    set((state) => ({ alerts: state.alerts.filter(a => a.id !== id) }));
  },

  evaluatePrice: (epic: string, currentPrice: number) => {
    const { alerts } = get();
    let updated = false;

    const evaluatedAlerts = alerts.map(alert => {
      if (alert.triggered || alert.epic !== epic) return alert;

      let triggerNow = false;
      if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
        triggerNow = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
        triggerNow = true;
      }

      if (triggerNow) {
        updated = true;
        
        // Push a custom event that Phase 3 UI can listen to for toast notifications
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('alert-triggered', { detail: { alert: { ...alert, triggered: true }, currentPrice } }));
        }

        return { ...alert, triggered: true };
      }
      return alert;
    });

    if (updated) {
      set({ alerts: evaluatedAlerts });
    }
  }
}));

// Removed E2E mock since it's now handled by ws-manager

