import type { RoleId } from './types';
import fundAvatar from './assets/avatars/avatar-fund-neutral.png';
import cryptoAvatar from './assets/avatars/avatar-crypto-neutral.png';
import stockAvatar from './assets/avatars/avatar-stock-neutral.png';
import friendAvatar from './assets/characters/npc-friend-neutral.png';

export const ROLE_AVATARS: Readonly<Record<RoleId, string>> = {
  fund: fundAvatar,
  crypto: cryptoAvatar,
  stock: stockAvatar,
};

const FRIEND_SPEAKERS = new Set(['朋友', '老同学', '恐慌的室友', '短线朋友']);

/** Return only artwork that exists; unmapped speakers keep the text-only card. */
export function characterArtwork(speaker: string): string | undefined {
  return FRIEND_SPEAKERS.has(speaker) ? friendAvatar : undefined;
}
