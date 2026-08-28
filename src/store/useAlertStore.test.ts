import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertStore } from './useAlertStore';

describe('useAlertStore Engine', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
  });

  it('adds an alert correctly', () => {
    useAlertStore.getState().addAlert('AAPL', 150, 100);
    const alerts = useAlertStore.getState().alerts;
    expect(alerts.length).toBe(1);
    expect(alerts[0].targetPrice).toBe(150);
    expect(alerts[0].condition).toBe('above'); // current(100) < target(150)
  });

  it('triggers an above alert', () => {
    useAlertStore.getState().addAlert('AAPL', 150, 100);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice('AAPL', 149);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice('AAPL', 150);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(true);
  });

  it('triggers a below alert', () => {
    useAlertStore.getState().addAlert('AAPL', 100, 150);
    expect(useAlertStore.getState().alerts[0].condition).toBe('below');

    useAlertStore.getState().evaluatePrice('AAPL', 101);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice('AAPL', 100);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(true);
  });
});
