import type { PersonaArtwork } from './personaArtwork';
import puffin from './assets/persona-puffin-card.webp';
import raccoon from './assets/persona-raccoon-card.webp';
import gecko from './assets/persona-gecko-card.webp';
import squirrel from './assets/persona-squirrel-card.webp';
import bat from './assets/persona-bat-card.webp';
import panda from './assets/persona-panda-card.webp';
import puffinThumb from './assets/persona-puffin-thumb.webp';
import raccoonThumb from './assets/persona-raccoon-thumb.webp';
import geckoThumb from './assets/persona-gecko-thumb.webp';
import squirrelThumb from './assets/persona-squirrel-thumb.webp';
import batThumb from './assets/persona-bat-thumb.webp';
import pandaThumb from './assets/persona-panda-thumb.webp';

export const EXTRA_PERSONA_ARTWORKS: readonly PersonaArtwork[] = [
  { id: 'puffin', number: '10', name: '追浪海鹦', emoji: '🐦', image: puffin, thumbnail: puffinThumb, accent: '#70C8C1' },
  { id: 'raccoon', number: '11', name: '逆势浣熊', emoji: '🦝', image: raccoon, thumbnail: raccoonThumb, accent: '#D4AA79' },
  { id: 'gecko', number: '12', name: '断线壁虎', emoji: '🦎', image: gecko, thumbnail: geckoThumb, accent: '#8DC792' },
  { id: 'squirrel', number: '13', name: '算盘松鼠', emoji: '🐿️', image: squirrel, thumbnail: squirrelThumb, accent: '#D7B36A' },
  { id: 'bat', number: '14', name: '熬夜蝙蝠', emoji: '🦇', image: bat, thumbnail: batThumb, accent: '#A99AD6' },
  { id: 'panda', number: '15', name: '钟摆熊猫', emoji: '🐼', image: panda, thumbnail: pandaThumb, accent: '#B7C5B2' },
];
