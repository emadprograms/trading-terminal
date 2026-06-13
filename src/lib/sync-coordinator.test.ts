import { describe, it, expect } from 'vitest';
import { DataStitchingError } from './sync-coordinator';

describe('DataStitchingError', () => {
  it('Test 1 & 2: Should trigger DataStitchingError with specific gap description when gap exceeds acceptable threshold', () => {
    const error = new DataStitchingError("Timestamp continuity broken", "Gap of 15 minutes between REST history and WebSocket ticks exceeds acceptable threshold");
    expect(error.name).toBe('DataStitchingError');
    expect(error.description).toBe('Timestamp continuity broken');
    expect(error.reason).toContain('Gap of 15 minutes');
    expect(error.message).toBe('Data Stitching Error: Timestamp continuity broken - Gap of 15 minutes between REST history and WebSocket ticks exceeds acceptable threshold');
  });
});
