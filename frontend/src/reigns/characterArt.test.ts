import { describe, expect, it } from 'vitest';
import { characterArtwork, ROLE_AVATARS } from './characterArt';
import { ROLE_IDS } from './roles';

describe('character artwork', () => {
  it('provides an avatar for every playable role', () => {
    expect(Object.keys(ROLE_AVATARS).sort()).toEqual([...ROLE_IDS].sort());
  });

  it('maps all friend speakers to the approved friend artwork', () => {
    for (const speaker of ['朋友', '老同学', '恐慌的室友', '短线朋友']) {
      expect(characterArtwork(speaker)).toBeTruthy();
    }
  });

  it('does not substitute unrelated artwork for missing characters', () => {
    expect(characterArtwork('合规专员')).toBeUndefined();
  });
});
