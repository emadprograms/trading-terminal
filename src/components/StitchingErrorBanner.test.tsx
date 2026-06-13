import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StitchingErrorBanner } from './StitchingErrorBanner';
import React from 'react';

describe('StitchingErrorBanner', () => {
  it('Test 3: StitchingErrorBanner should display exact format when error occurs', () => {
    render(<StitchingErrorBanner error={{ description: 'Timestamp continuity broken', reason: 'Gap detected' }} />);
    const banner = screen.getByText('Data Stitching Error: Timestamp continuity broken - Gap detected');
    expect(banner).toBeInTheDocument();
  });

  it('should not render if no error is provided', () => {
    const { container } = render(<StitchingErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });
});
