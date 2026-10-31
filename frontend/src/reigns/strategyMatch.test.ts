import { describe, expect, it } from 'vitest';
import { ALL_PERSONAS } from './personaRules';
import { qubeChatLink, strategyFor } from './strategyMatch';

describe('Qube strategy handoff', () => {
  it('gives every persona a distinct evidence-based strategy prompt', () => {
    for (const persona of ALL_PERSONAS) {
      const match = strategyFor(persona);
      expect(match.title.length).toBeGreaterThan(3);
      expect(match.prompt).toContain('回测');
      expect(match.prompt).not.toContain('稳赚');
      const url = new URL(qubeChatLink(persona));
      expect(url.origin).toBe('https://www.pandaaiquant.com');
      expect(url.pathname).toBe('/agent_quant/chat');
      expect(url.searchParams.get('message')).toBe(match.prompt);
    }
  });
});
