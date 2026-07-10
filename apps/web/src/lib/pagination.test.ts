import { parseLimit, parsePage } from './pagination';

describe('parsePage', () => {
  it('defaults to 1 when undefined', () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it('parses a valid positive integer string', () => {
    expect(parsePage('3')).toBe(3);
  });

  it('falls back to 1 for zero, negative, or non-numeric values', () => {
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-1')).toBe(1);
    expect(parsePage('abc')).toBe(1);
  });
});

describe('parseLimit', () => {
  it('returns undefined when undefined', () => {
    expect(parseLimit(undefined)).toBeUndefined();
  });

  it('parses a valid positive integer string', () => {
    expect(parseLimit('2')).toBe(2);
  });

  it('falls back to undefined for zero, negative, or non-numeric values', () => {
    expect(parseLimit('0')).toBeUndefined();
    expect(parseLimit('-1')).toBeUndefined();
    expect(parseLimit('abc')).toBeUndefined();
  });
});
