import { describe, it, expect } from 'vitest';
import {
  cleanHeadingText,
  isPlausibleTitle,
  buildTocSuggestions,
} from '../tocSuggestions';

describe('cleanHeadingText', () => {
  it('collapses whitespace and strips OCR junk characters', () => {
    expect(cleanHeadingText('  No. 1  —  De   l’articulation  ')).toBe(
      'No. 1 — De l’articulation'
    );
    expect(cleanHeadingText('~*| STUDY No. 4 |*~')).toBe('STUDY No. 4');
    expect(cleanHeadingText('Étude — très modéré')).toBe('Étude — très modéré');
  });

  it('trims stray punctuation from the edges', () => {
    expect(cleanHeadingText('-- Scherzetto --')).toBe('Scherzetto');
    expect(cleanHeadingText(',,Allegro moderato;;')).toBe('Allegro moderato');
  });

  it('caps very long OCR runs', () => {
    expect(cleanHeadingText('x'.repeat(500)).length).toBeLessThanOrEqual(120);
  });
});

describe('isPlausibleTitle', () => {
  it('accepts real titles', () => {
    for (const t of ['No. 14 — Pour l’exercice', 'The Carnival of Venice', 'First Studies']) {
      expect(isPlausibleTitle(t), t).toBe(true);
    }
  });

  it('rejects page numbers, plate numbers, and fragments', () => {
    for (const t of ['42', '', 'a b', '12345 678', 'A. L. 12.345']) {
      expect(isPlausibleTitle(t), JSON.stringify(t)).toBe(false);
    }
  });
});

describe('buildTocSuggestions', () => {
  it('keeps unique headings and maps pages through', () => {
    const out = buildTocSuggestions([
      { page: 4, text: 'No. 1 — De l’articulation' },
      { page: 6, text: 'No. 2 — Du style' },
      { page: 9, text: '' },
    ]);
    expect(out).toEqual([
      { page: 4, title: 'No. 1 — De l’articulation', preview: undefined },
      { page: 6, title: 'No. 2 — Du style', preview: undefined },
    ]);
  });

  it('drops running headers that repeat across many pages', () => {
    const headings = [
      { page: 1, text: 'Twenty Six Melodious Studies' },
      { page: 2, text: 'Twenty-Six  Melodious Studies' }, // same, OCR variance
      { page: 3, text: 'twenty six melodious studies' },
      { page: 4, text: 'Study No. 1' },
      { page: 8, text: 'Study No. 2' },
    ];
    const out = buildTocSuggestions(headings);
    expect(out.map(s => s.title)).toEqual(['Study No. 1', 'Study No. 2']);
  });

  it('keeps repeats below the running-header threshold', () => {
    const out = buildTocSuggestions([
      { page: 1, text: 'Intermezzo' },
      { page: 30, text: 'Intermezzo' },
      { page: 50, text: 'Finale' },
    ]);
    expect(out).toHaveLength(3);
  });
});
