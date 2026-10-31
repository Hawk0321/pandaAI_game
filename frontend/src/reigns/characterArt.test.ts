import { describe, expect, it } from 'vitest';
import { characterArtwork, ROLE_AVATARS } from './characterArt';
import { ROLE_IDS } from './roles';
import { ALL_CARDS } from './allCards';

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
    expect(characterArtwork('自己')).toBeUndefined();
    expect(characterArtwork('未登记人物')).toBeUndefined();
  });

  it('maps every non-self speaker in the playable card library', () => {
    const missing = [...new Set(ALL_CARDS.map((card) => card.speaker))]
      .filter((speaker) => speaker !== '自己' && !characterArtwork(speaker));
    expect(missing).toEqual([]);
  });
});
