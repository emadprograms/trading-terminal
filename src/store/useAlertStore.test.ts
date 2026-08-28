import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertStore } from './useAlertStore';

describe('useAlertStore Engine', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [] });
  });

  it('adds an alert correctly', () => {
    useAlertStore.getState().addAlert(150, 100);
    const alerts = useAlertStore.getState().alerts;
    expect(alerts.length).toBe(1);
    expect(alerts[0].targetPrice).toBe(150);
    expect(alerts[0].condition).toBe('above'); // current(100) < target(150)
  });

  it('triggers an above alert', () => {
    useAlertStore.getState().addAlert(150, 100);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice(149);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice(150);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(true);
  });

  it('triggers a below alert', () => {
    useAlertStore.getState().addAlert(100, 150);
    expect(useAlertStore.getState().alerts[0].condition).toBe('below');

    useAlertStore.getState().evaluatePrice(101);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(false);

    useAlertStore.getState().evaluatePrice(100);
    expect(useAlertStore.getState().alerts[0].triggered).toBe(true);
  });
});
