// Utility functions for page number formatting

// Convert a number to lowercase Roman numerals (for preface pages)
export function toRomanNumeral(num: number): string {
  if (num <= 0) return '';

  const romanNumerals: [number, string][] = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

// Convert a Roman numeral string to a number
export function fromRomanNumeral(roman: string): number | null {
  const romanValues: Record<string, number> = {
    'i': 1,
    'v': 5,
    'x': 10,
    'l': 50,
    'c': 100,
    'd': 500,
    'm': 1000,
  };

  const lower = roman.toLowerCase().trim();
  if (!lower || !/^[ivxlcdm]+$/.test(lower)) {
    return null;
  }

  let result = 0;
  let prevValue = 0;

  for (let i = lower.length - 1; i >= 0; i--) {
    const value = romanValues[lower[i]];
    if (value < prevValue) {
      result -= value;
    } else {
      result += value;
    }
    prevValue = value;
  }

  return result;
}

// Format a page number for display
// Negative pages (preface) are shown as Roman numerals
// Non-negative pages are shown as Arabic numerals
export function formatDisplayPageNumber(page: number, pageOffset: number = 0): string {
  if (page < 0) {
    // Convert negative page to Roman numeral (e.g., -7 -> i, -6 -> ii, etc.)
    return toRomanNumeral(pageOffset + page + 1); // +1 because Roman numerals are 1-indexed
  }
  return page.toString();
}

// Parse a display page number back to internal page number
// Accepts both Roman numerals (for preface) and Arabic numerals
export function parseDisplayPageNumber(input: string, pageOffset: number = 0): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try parsing as a regular number first
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    return num;
  }

  // Try parsing as a Roman numeral
  const romanValue = fromRomanNumeral(trimmed);
  if (romanValue !== null && romanValue > 0 && romanValue <= pageOffset) {
    // Convert Roman numeral back to internal negative page number
    // e.g., "i" (1) with offset 7 -> -7, "ii" (2) -> -6, etc.
    return romanValue - pageOffset - 1;
  }

  return null;
}

// Get the minimum page number (negative offset for preface pages)
export function getMinPage(pageOffset: number = 0): number {
  return -pageOffset;
}
