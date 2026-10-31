import bull from './assets/persona-bull.webp';
import owl from './assets/persona-owl.webp';
import shark from './assets/persona-shark.webp';
import turtle from './assets/persona-turtle.webp';
import crab from './assets/persona-crab.webp';
import dolphin from './assets/persona-dolphin.webp';
import fox from './assets/persona-fox.webp';
import sloth from './assets/persona-sloth.webp';

export interface PersonaArtwork {
  id: string;
  number: string;
  name: string;
  emoji: string;
  image: string;
  accent: string;
}

/** 只是插画图鉴，不参与画像判断。名称由 D 的 persona.ts 约定。 */
export const PERSONA_ARTWORKS: readonly PersonaArtwork[] = [
  { id: 'bull', number: '01', name: '冲锋蛮牛', emoji: '🐂', image: bull, accent: '#e7b379' },
  { id: 'owl', number: '02', name: '夜猫研究员', emoji: '🦉', image: owl, accent: '#bfdcb8' },
  { id: 'shark', number: '03', name: '深海猎鲨', emoji: '🦈', image: shark, accent: '#9dcbd4' },
  { id: 'turtle', number: '04', name: '稳健老龟', emoji: '🐢', image: turtle, accent: '#b5d2a3' },
  { id: 'crab', number: '05', name: '逆行螃蟹', emoji: '🦀', image: crab, accent: '#e6ac96' },
  { id: 'dolphin', number: '06', name: '冲浪海豚', emoji: '🐬', image: dolphin, accent: '#a8dccc' },
  { id: 'fox', number: '07', name: '灵活狐狸', emoji: '🦊', image: fox, accent: '#e4bd88' },
  { id: 'sloth', number: '08', name: '树懒观察员', emoji: '🦥', image: sloth, accent: '#d0cfab' },
];

export function resolvePersonaArtwork(name: string): { artwork: PersonaArtwork; matched: boolean } {
  const exact = PERSONA_ARTWORKS.find(item => item.name === name);
  return { artwork: exact ?? PERSONA_ARTWORKS[name === '冲锋熊猫' ? 0 : 6], matched: !!exact };
}
