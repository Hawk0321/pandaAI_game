import { describe, expect, it } from 'vitest';
import { endingArtwork, pickEndingArt, survivalBadge } from './endingArt';
import { getEndings } from './endings';
import { ROLE_IDS } from './roles';
import { SURVIVAL_TIERS } from './survival';

describe('结局插图', () => {
  it('未知结局或段位回退 undefined（界面不占位）', () => {
    expect(endingArtwork('no-such-ending', 'fund')).toBeUndefined();
    expect(survivalBadge('tier-unknown' as never)).toBeUndefined();
  });

  it('对所有已知结局和段位调用都不抛错，结果要么是字符串要么是 undefined', () => {
    for (const role of ROLE_IDS) for (const e of getEndings(role)) {
      const art = endingArtwork(e.id, role);
      expect(art === undefined || typeof art === 'string').toBe(true);
    }
    for (const tier of SURVIVAL_TIERS) {
      const badge = survivalBadge(tier.id);
      expect(badge === undefined || typeof badge === 'string').toBe(true);
    }
    for (const role of ROLE_IDS) for (const e of getEndings(role)) expect(endingArtwork(e.id, role)).toBeTruthy();
    for (const tier of SURVIVAL_TIERS) expect(survivalBadge(tier.id)).toBeTruthy();
  });

  it('优先用角色换色版，其次通用版', () => {
    const modules = {
      './assets/endings/ending-sp-inertia.png': '/generic.png',
      './assets/endings/ending-sp-inertia-crypto.png': '/crypto.png',
    };
    expect(pickEndingArt(modules, 'sp-inertia', 'crypto')).toBe('/crypto.png');
    expect(pickEndingArt(modules, 'sp-inertia', 'fund')).toBe('/generic.png');
    expect(pickEndingArt(modules, 'fund-low-capital', 'fund')).toBeUndefined();
  });
});
