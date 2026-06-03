import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnvToggle } from './EnvToggle';
import { useSession } from '../hooks/useSession';
import { useSessionStore } from '../store/useSessionStore';

vi.mock('../hooks/useSession');
vi.mock('../store/useSessionStore');

describe('EnvToggle', () => {
  it('renders DEMO and LIVE buttons', () => {
    (useSession as any).mockReturnValue({
      login: vi.fn(),
      isLoggingIn: false,
    });
    (useSessionStore as any).mockReturnValue({
      environment: 'DEMO',
    });

    render(<EnvToggle />);
    expect(screen.getByText('DEMO')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('highlights the active environment', () => {
    (useSession as any).mockReturnValue({
      login: vi.fn(),
      isLoggingIn: false,
    });
    (useSessionStore as any).mockReturnValue({
      environment: 'LIVE',
    });

    render(<EnvToggle />);
    const liveButton = screen.getByText('LIVE').closest('button');
    // We expect some visual indicator of being active
    expect(liveButton).toHaveAttribute('data-active', 'true');
  });

  it('calls login with correct environment when clicked', async () => {
    const loginMock = vi.fn();
    (useSession as any).mockReturnValue({
      login: loginMock,
      isLoggingIn: false,
    });
    (useSessionStore as any).mockReturnValue({
      environment: 'DEMO',
    });

    render(<EnvToggle />);
    fireEvent.click(screen.getByText('LIVE'));
    
    expect(loginMock).toHaveBeenCalledWith({ environment: 'LIVE' });
  });

  it('shows loading state when logging in', () => {
    (useSession as any).mockReturnValue({
      login: vi.fn(),
      isLoggingIn: true,
    });
    (useSessionStore as any).mockReturnValue({
      environment: 'DEMO',
    });

    render(<EnvToggle />);
    // Should show Activity icon or similar
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
