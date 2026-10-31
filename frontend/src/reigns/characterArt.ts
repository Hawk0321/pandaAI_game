import type { RoleId } from './types';
import fundAvatar from './assets/avatars/avatar-fund-neutral.png';
import cryptoAvatar from './assets/avatars/avatar-crypto-neutral.png';
import stockAvatar from './assets/avatars/avatar-stock-neutral.png';

const modules = import.meta.glob('./assets/characters/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const art = (id: string) => modules[`./assets/characters/${id}-neutral.png`];

export const ROLE_AVATARS: Readonly<Record<RoleId, string>> = {
  fund: fundAvatar,
  crypto: cryptoAvatar,
  stock: stockAvatar,
};

const SPEAKER_CHARACTERS: Readonly<Record<string, string>> = {
  '朋友': 'npc-friend', '老同学': 'npc-friend', '恐慌的室友': 'npc-friend', '短线朋友': 'npc-friend',
  '同事': 'npc-colleague', '老同事': 'npc-colleague', '亏钱的同事': 'npc-colleague', '同行': 'npc-colleague',
  '群友': 'npc-chatmate', '股友群': 'npc-chatmate', '社群': 'npc-chatmate', '群里的大V': 'npc-chatmate',
  '家人': 'npc-family', '亲友': 'npc-family',
  '客服': 'npc-support', '平台客服': 'npc-support', '交易所客服': 'npc-support',
  '财经记者': 'npc-media', '节目编导': 'npc-media', '网课讲师': 'npc-media',
  '论坛版主': 'npc-host', '社区管理员': 'npc-host', '主办方': 'npc-host',
  '新人': 'npc-newbie', '助理': 'npc-newbie', '研究员': 'npc-researcher',
  '导师': 'npc-mentor', '前辈': 'npc-mentor', '神秘人': 'npc-stranger', '陌生私信': 'npc-stranger',
  '券商 App': 'npc-market-ticker', '财经 App': 'npc-market-ticker', '匿名行情': 'npc-market-ticker',
  '渠道经理': 'npc-client-manager', '券商客户经理': 'npc-client-manager',
  '投资总监': 'npc-fund-cio', '投委会': 'npc-fund-cio', '基金经理': 'npc-fund-cio',
  '销售总监': 'npc-fund-sales-director', '销售': 'npc-fund-sales-director', '老板': 'npc-fund-boss',
  '合规专员': 'npc-fund-compliance', '风控专员': 'npc-fund-compliance',
  '匿名开发者': 'npc-crypto-anon-dev', '推特大 V': 'npc-crypto-kol',
  '链上分析员': 'npc-crypto-onchain-analyst', '安全研究员': 'npc-crypto-onchain-analyst',
  '协议文档': 'npc-crypto-chain-feed', '社区提案': 'npc-crypto-chain-feed', '推特热搜': 'npc-crypto-chain-feed',
  '营业部大妈': 'npc-stock-auntie', '盯盘老哥': 'npc-stock-screen-watcher', '盯盘群老哥': 'npc-stock-screen-watcher',
  '老股民': 'npc-stock-veteran', '期货老手': 'npc-stock-veteran',
};

/** Return only artwork that exists; unmapped speakers keep the text-only card. */
export function characterArtwork(speaker: string): string | undefined {
  const character = SPEAKER_CHARACTERS[speaker];
  return character ? art(character) : undefined;
}

export function selfArtwork(role: RoleId): string {
  return art(`self-${role}`);
}
