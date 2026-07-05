import { describe, it, expect } from 'vitest';
import { extractYouTubeVideoId, isValidYouTubeVideoId } from '../youtube';

const ID = 'dQw4w9WgXcQ';

describe('isValidYouTubeVideoId', () => {
  it('accepts 11-character IDs', () => {
    expect(isValidYouTubeVideoId(ID)).toBe(true);
    expect(isValidYouTubeVideoId('abc-DEF_123')).toBe(true);
  });

  it('rejects wrong lengths and characters', () => {
    expect(isValidYouTubeVideoId('')).toBe(false);
    expect(isValidYouTubeVideoId('short')).toBe(false);
    expect(isValidYouTubeVideoId('waytoolongid')).toBe(false);
    expect(isValidYouTubeVideoId('has space!!')).toBe(false);
  });
});

describe('extractYouTubeVideoId', () => {
  it('passes through a bare video ID', () => {
    expect(extractYouTubeVideoId(ID)).toBe(ID);
    expect(extractYouTubeVideoId(`  ${ID}  `)).toBe(ID);
  });

  it('extracts from watch URLs', () => {
    expect(extractYouTubeVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://youtube.com/watch?v=${ID}&t=42s`)).toBe(ID);
    expect(extractYouTubeVideoId(`http://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://music.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it('extracts from short and embed URLs', () => {
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://youtu.be/${ID}?si=xyz123`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
  });

  it('handles URLs without a protocol', () => {
    expect(extractYouTubeVideoId(`youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractYouTubeVideoId(`youtu.be/${ID}`)).toBe(ID);
  });

  it('rejects non-YouTube URLs and garbage', () => {
    expect(extractYouTubeVideoId('')).toBeNull();
    expect(extractYouTubeVideoId('not a url at all')).toBeNull();
    expect(extractYouTubeVideoId(`https://vimeo.com/${ID}`)).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=tooshort')).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com/watch')).toBeNull();
    // youtube.com lookalike domain must not be accepted
    expect(extractYouTubeVideoId(`https://evilyoutube.com/watch?v=${ID}`)).toBeNull();
  });
});
