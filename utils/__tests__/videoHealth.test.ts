import { describe, it, expect } from 'vitest';
import { classifyVideoHealth } from '../videoHealth';

describe('classifyVideoHealth', () => {
  it('flags ids missing from the response as unavailable', () => {
    const problems = classifyVideoHealth(
      ['aaaaaaaaaaa', 'bbbbbbbbbbb'],
      [{ id: 'aaaaaaaaaaa', status: { privacyStatus: 'public', embeddable: true } }]
    );
    expect(problems.get('bbbbbbbbbbb')).toBe('unavailable');
    expect(problems.has('aaaaaaaaaaa')).toBe(false);
  });

  it('flags embed-disabled and failed uploads', () => {
    const problems = classifyVideoHealth(
      ['ccccccccccc', 'ddddddddddd'],
      [
        { id: 'ccccccccccc', status: { privacyStatus: 'public', embeddable: false } },
        { id: 'ddddddddddd', status: { uploadStatus: 'failed' } },
      ]
    );
    expect(problems.get('ccccccccccc')).toBe('embedding disabled');
    expect(problems.get('ddddddddddd')).toBe('upload failed');
  });

  it('treats unlisted embeddable videos as healthy', () => {
    const problems = classifyVideoHealth(
      ['eeeeeeeeeee'],
      [{ id: 'eeeeeeeeeee', status: { privacyStatus: 'unlisted', embeddable: true } }]
    );
    expect(problems.size).toBe(0);
  });
});
