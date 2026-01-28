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

// Format a page number for display
// Negative pages (preface) are shown as Roman numerals
// Non-negative pages are shown as Arabic numerals
export function formatDisplayPageNumber(page: number, pageOffset: number = 0): string {
  if (page < 0) {
    // Convert negative page to Roman numeral (e.g., -7 -> i, -6 -> ii, etc.)
    const romanPage = pageOffset + page; // e.g., 7 + (-7) = 0, but we want 1-indexed
    return toRomanNumeral(pageOffset + page + 1); // +1 because Roman numerals are 1-indexed
  }
  return page.toString();
}

// Get the minimum page number (negative offset for preface pages)
export function getMinPage(pageOffset: number = 0): number {
  return -pageOffset;
}
