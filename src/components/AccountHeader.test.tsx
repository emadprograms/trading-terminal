import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AccountHeader } from './AccountHeader';
import { useQuery } from '@tanstack/react-query';
import { useSessionStore } from '../store/useSessionStore';

vi.mock('@tanstack/react-query');
vi.mock('../store/useSessionStore');

describe('AccountHeader', () => {
  it('renders account metrics when data is loaded', () => {
    (useQuery as any).mockReturnValue({
      data: {
        accounts: [{
          balance: {
            equity: 12500.50,
            margin: 500,
            available: 12000.50
          },
          currency: 'USD'
        }]
      },
      isLoading: false,
    });
    (useSessionStore as any).mockReturnValue({
      isAuthenticated: true,
    });

    render(<AccountHeader />);
    
    expect(screen.getByText(/\$12,500\.50/)).toBeInTheDocument();
    expect(screen.getByText(/Margin: \$500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Avail: \$12,000\.50/)).toBeInTheDocument();
  });

  it('shows online indicator when authenticated', () => {
    (useQuery as any).mockReturnValue({
      data: { accounts: [] },
      isLoading: false,
    });
    (useSessionStore as any).mockReturnValue({
      isAuthenticated: true,
    });

    render(<AccountHeader />);
    // Indicator should have class status-online or similar per index.css
    expect(screen.getByTestId('online-indicator')).toBeInTheDocument();
  });
});
