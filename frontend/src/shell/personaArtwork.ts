import bull from './assets/persona-bull-card.webp';
import owl from './assets/persona-owl-card.webp';
import shark from './assets/persona-shark-card.webp';
import turtle from './assets/persona-turtle-card.webp';
import crab from './assets/persona-crab-card.webp';
import dolphin from './assets/persona-dolphin-card.webp';
import fox from './assets/persona-fox-card.webp';
import sloth from './assets/persona-sloth-card.webp';
import hedgehog from './assets/persona-hedgehog-card.webp';
import bullThumbnail from './assets/persona-bull-thumb.webp';
import owlThumbnail from './assets/persona-owl-thumb.webp';
import sharkThumbnail from './assets/persona-shark-thumb.webp';
import turtleThumbnail from './assets/persona-turtle-thumb.webp';
import crabThumbnail from './assets/persona-crab-thumb.webp';
import dolphinThumbnail from './assets/persona-dolphin-thumb.webp';
import foxThumbnail from './assets/persona-fox-thumb.webp';
import slothThumbnail from './assets/persona-sloth-thumb.webp';
import hedgehogThumbnail from './assets/persona-hedgehog-thumb.webp';
import { EXTRA_PERSONA_ARTWORKS } from './personaArtworkExtras';

export interface PersonaArtwork {
  id: string;
  number: string;
  name: string;
  emoji: string;
  image: string;
  thumbnail: string;
  accent: string;
}

/** 只是插画图鉴，不参与画像判断。九个 id/名称对照 #16 persona.ts 的 PERSONA_CARDS。
 * 已有图鉴编号保持稳定；不在 C 模块复制或提前引入 D 的人物判别规则。
 */
export const PERSONA_ARTWORKS: readonly PersonaArtwork[] = [
  { id: 'bull', number: '01', name: '冲锋蛮牛', emoji: '🐂', image: bull, thumbnail: bullThumbnail, accent: '#e7b379' },
  { id: 'owl', number: '02', name: '夜猫研究员', emoji: '🦉', image: owl, thumbnail: owlThumbnail, accent: '#bfdcb8' },
  { id: 'shark', number: '03', name: '深海猎鲨', emoji: '🦈', image: shark, thumbnail: sharkThumbnail, accent: '#9dcbd4' },
  { id: 'turtle', number: '04', name: '稳健老龟', emoji: '🐢', image: turtle, thumbnail: turtleThumbnail, accent: '#b5d2a3' },
  { id: 'crab', number: '05', name: '逆行螃蟹', emoji: '🦀', image: crab, thumbnail: crabThumbnail, accent: '#e6ac96' },
  { id: 'dolphin', number: '06', name: '冲浪海豚', emoji: '🐬', image: dolphin, thumbnail: dolphinThumbnail, accent: '#a8dccc' },
  { id: 'fox', number: '07', name: '灵活狐狸', emoji: '🦊', image: fox, thumbnail: foxThumbnail, accent: '#e4bd88' },
  { id: 'sloth', number: '08', name: '树懒观察员', emoji: '🦥', image: sloth, thumbnail: slothThumbnail, accent: '#d0cfab' },
  { id: 'hedgehog', number: '09', name: '死扛刺猬', emoji: '🦔', image: hedgehog, thumbnail: hedgehogThumbnail, accent: '#C9A36B' },
  ...EXTRA_PERSONA_ARTWORKS,
];

export function resolvePersonaArtwork(name: string): { artwork: PersonaArtwork; matched: boolean } {
  const exact = PERSONA_ARTWORKS.find(item => item.name === name);
  return { artwork: exact ?? PERSONA_ARTWORKS[name === '冲锋熊猫' ? 0 : 6], matched: !!exact };
}
