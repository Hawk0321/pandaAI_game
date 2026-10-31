/**
 * 滑牌游戏（Reigns 类，交易主题）共享类型。
 * 引擎（engine.ts / cards.ts）和界面（ReignsGame.tsx）都只依赖这个文件。
 * 卡牌内容为原创虚构，不含真实行情；全部属于示例内容（is_sample）。
 */

/** 四条数值，范围 0–100，初始 50。任意一条到 0 或 100 即结束。 */
export type StatKey = 'capital' | 'risk' | 'confidence' | 'reputation';

export const STAT_KEYS: readonly StatKey[] = ['capital', 'risk', 'confidence', 'reputation'];

export const STAT_LABELS: Readonly<Record<StatKey, string>> = {
  capital: '资金',
  risk: '风控',
  confidence: '信心',
  reputation: '口碑',
};

export type Side = 'left' | 'right';

/** 对数值的影响，只写有变化的项，单位为点数（可正可负）。 */
export type Effects = Readonly<Partial<Record<StatKey, number>>>;

/**
 * 风格标签：每个选项可带 0–2 个，玩家一局下来的标签累计决定结局页的交易人格。
 * 与人物卡一一对应（frontend/src/profile/persona.ts 的 PersonaId）：
 *   passive→sloth 树懒观察员   impulsive→bull 冲锋蛮牛   stubborn→hedgehog 死扛刺猬
 *   research→owl 夜猫研究员    concentrated→shark 深海猎鲨 cautious→turtle 稳健老龟
 *   trend→dolphin 冲浪海豚     contrarian→crab 逆行螃蟹    adaptive→fox 灵活狐狸
 */
export type StyleTag =
  | 'passive' | 'impulsive' | 'stubborn' | 'research' | 'concentrated'
  | 'cautious' | 'trend' | 'contrarian' | 'adaptive';

export const STYLE_TAGS: readonly StyleTag[] = [
  'passive', 'impulsive', 'stubborn', 'research', 'concentrated',
  'cautious', 'trend', 'contrarian', 'adaptive',
];

export type StyleTally = Readonly<Record<StyleTag, number>>;

/** 一局最多走多少回合；走满没触底也没爆满，就以“存活结局”收尾。 */
export const MAX_TURNS = 40;

export interface Choice {
  /** 选项文字，显示在卡牌上，不超过 8 个字。 */
  readonly label: string;
  readonly effects: Effects;
  /** 0–2 个风格标签，累计后决定人物卡。每张卡的两个选项最好带不同的标签。 */
  readonly tags?: readonly StyleTag[];
  /** 选完之后显示的一句“后来……”（奇遇卡用它揭晓真实走势，不超过 40 字）。 */
  readonly aftermath?: string;
}

/** 由 main 分支的真实行情关卡改写的“奇遇”卡的来源信息。 */
export interface AdventureSource {
  /** 关卡 id，如 "L03"。 */
  readonly levelId: string;
  /** 行情类型，取自关卡 reveal 的 scenario。 */
  readonly scenario: 'uptrend' | 'crash' | 'range' | 'fake_breakout' | 'v_reversal' | 'gap';
}

export interface Card {
  /** 日常卡自由命名；奇遇卡必须以 "adv-" 开头，如 "adv-L03-a"。 */
  readonly id: string;
  /** 提出事件的角色，如“老同事”“基金经理”。 */
  readonly speaker: string;
  /** 事件正文，一两句话。奇遇卡的正文只能用关卡 play 文件里“当时可见”的信息。 */
  readonly text: string;
  readonly left: Choice;
  readonly right: Choice;
  /** 有值表示这是奇遇卡。 */
  readonly adventure?: AdventureSource;
  /** 标注为示例内容。 */
  readonly is_sample: true;
}

export type Stats = Readonly<Record<StatKey, number>>;

export type EndingKind = 'low' | 'high';

export interface Ending {
  /** 唯一 id：普通结局用 "low-capital" 这种写法，特殊结局用 "sp-" 开头。 */
  readonly id: string;
  /** 普通结局对应触底/爆满的那条数值；特殊结局可为 null。 */
  readonly stat: StatKey | null;
  readonly kind: EndingKind | 'survive' | 'special';
  readonly title: string;
  readonly description: string;
  /** 是否特殊结局（含走满回合的存活结局）。 */
  readonly special: boolean;
}

export interface ChoiceLog {
  readonly cardId: string;
  readonly side: Side;
}

export interface GameState {
  readonly stats: Stats;
  /** 已经做过的决定数（回合数）。 */
  readonly turn: number;
  /** 当前要显示的卡牌；结束后为 null。 */
  readonly current: Card | null;
  /** 还没抽到的卡牌 id 队列。 */
  readonly deck: readonly string[];
  /** 结束后非 null。 */
  readonly ending: Ending | null;
  /** 风格标签累计，初始全 0；每次 choose 把所选选项的 tags 各加 1。 */
  readonly tally: StyleTally;
  /** 到目前为止做过的每次选择，按顺序。 */
  readonly log: readonly ChoiceLog[];
  /** 上一次选择的 aftermath（没有则为 null），界面用来显示“后来……”。 */
  readonly lastAftermath: string | null;
}

/**
 * 引擎对外接口（engine.ts 必须导出这四个函数，全部为纯函数，不修改入参）。
 *
 * - createGame(cards, seed?)：洗牌（seed 相同则顺序相同）、发第一张牌。
 * - choose(state, side, cards)：应用所选选项的 effects，数值夹在 0–100，
 *   判断结局，没结束就抽下一张；牌抽完则重新洗牌继续。返回新状态。
 *   state.ending 非空时原样返回。抽完 MAX_TURNS 回合且没有触底或爆满，
 *   则进入"存活结局"（按 tally 决定标题和描述）。
 * - previewEffects(state, side)：返回该选项会改变的数值键，供界面提示用。
 * - inferPersona(tally)：风格标签累计 → 人物卡 id（取得最多的那个标签对应的卡）。
 */
export interface Engine {
  createGame(cards: readonly Card[], seed?: number): GameState;
  choose(state: GameState, side: Side, cards: readonly Card[]): GameState;
  previewEffects(state: GameState, side: Side): readonly StatKey[];
  inferPersona(tally: StyleTally): PersonaId;
}

/** 人物卡 id，和 frontend/src/profile/persona.ts 的 PersonaId 一致。 */
export type PersonaId = 'sloth' | 'bull' | 'hedgehog' | 'owl' | 'shark' | 'turtle' | 'dolphin' | 'crab' | 'fox';
