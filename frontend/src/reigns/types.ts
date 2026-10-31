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

/**
 * 角色：每个角色有自己的四条属性名称（见 roles.ts），事件库部分共享。
 * 引擎里的四个槽位 StatKey 对所有角色语义一致（钱 / 安全垫 / 定力 / 外界认可），
 * 所以共享事件卡的 effects 对每个角色都有意义。STAT_LABELS 只是默认（炒股达人）叫法，
 * 界面显示请用 ROLES[role].stats[key].label。
 */
export type RoleId = 'fund' | 'crypto' | 'stock';

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

/**
 * 加时起点：走过这么多回合仍未结束，就进入“加时”。之后每回合在玩家选项后附加随回合增长的种子抖动，
 * 并有随回合增长的“收盘铃”概率；靠触底/爆满、特殊结局或收盘铃结束。
 * 没有回合上限。界面（存活关数、加时标记）和引擎都用这个常量。
 */
export const OVERTIME_START = 40;

/**
 * @deprecated 已取消回合上限，不再作为结束条件；请改用 OVERTIME_START（加时起点）。
 * 仅为兼容旧引用保留，数值等于 OVERTIME_START。
 */
export const MAX_TURNS = OVERTIME_START;

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
  /**
   * 这张卡能在哪些角色里出现。省略 = 三个角色共享。
   * 共享卡的正文要用中性说法（“你”“持仓”“消息”），不要出现只属于某个角色的词。
   */
  readonly roles?: readonly RoleId[];
  /** 标注为示例内容。 */
  readonly is_sample: true;
}

export type Stats = Readonly<Record<StatKey, number>>;

export type EndingKind = 'low' | 'high';

export interface Ending {
  /**
   * 唯一 id：普通结局写 "<role>-low-capital" / "<role>-high-risk" 这种，
   * 特殊结局以 "sp-" 开头，如 "sp-fund-redemption" 或跨角色共用的 "sp-inertia"。
   */
  readonly id: string;
  /** 这个结局属于哪个角色；跨角色共用的写 'all'。 */
  readonly role: RoleId | 'all';
  /** 普通结局对应触底/爆满的那条数值；特殊结局可为 null。 */
  readonly stat: StatKey | null;
  readonly kind: EndingKind | 'survive' | 'special';
  readonly title: string;
  readonly description: string;
  /** 是否特殊结局（含加时收盘铃响时的存活结局）。 */
  readonly special: boolean;
}

export interface ChoiceLog {
  readonly cardId: string;
  readonly side: Side;
}

export interface GameState {
  /** 当前扮演的角色。 */
  readonly role: RoleId;
  /**
   * 本局种子（整数）。createGame 传入的 seed；没传就在创建时随机生成一个并存在这里。
   * 结局页的“伪随机选人格”用它做种子，所以同一局重复渲染、刷新结局页结果必须一致。
   */
  readonly seed: number;
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
  /**
   * 加时阶段（turn > OVERTIME_START）上一回合附加的市场抖动，只写有变化的项；没有抖动则省略或为 null。
   * 引擎负责写入，界面用来显示“市场抖动：资金 -6”。
   */
  readonly jitter?: Effects | null;
}

/**
 * 引擎对外接口（engine.ts 必须导出这四个函数，全部为纯函数，不修改入参）。
 *
 * - createGame(cards, seed?, role = 'stock')：只取 roles 省略或包含该角色的卡，
 *   洗牌（seed 相同则顺序相同）、发第一张牌。cards 传完整牌库即可。
 * - choose(state, side, cards)：cards 同样传完整牌库，引擎按 state.role 过滤（重洗时也一样）。应用所选选项的 effects，数值夹在 0–100，
 *   判断结局，没结束就抽下一张；牌抽完则重新洗牌继续。返回新状态。
 *   state.ending 非空时原样返回。没有回合上限：turn > OVERTIME_START 进入加时，
 *   每回合在选项之后再叠一次由 seed + turn 决定的市场抖动（写进 state.jitter，非加时为 null），
 *   并按随加时回合增长的概率敲“收盘铃”；铃响且没有触底/爆满/特殊结局时进入"存活结局"
 *   （行情亲历者 > 偏执专家 > 稳如磐石 > 活到收盘）。同一 seed、同一选择序列结果完全确定。
 * - previewEffects(state, side)：返回该选项会改变的数值键，供界面提示用。
 * - inferPersona(tally)：风格标签累计 → 人物卡 id（取得最多的那个标签对应的卡）。
 */
export interface Engine {
  createGame(cards: readonly Card[], seed?: number, role?: RoleId): GameState;
  choose(state: GameState, side: Side, cards: readonly Card[]): GameState;
  previewEffects(state: GameState, side: Side): readonly StatKey[];
  inferPersona(tally: StyleTally): PersonaId;
  /** 结局页用：state.ending 必须非空，否则抛错。纯函数、确定性。 */
  resolvePersona(state: GameState, cards: readonly Card[]): ResolvedPersona;
}

/**
 * 结局页最终展示的交易人格，由 resolvePersona(state, cards) 给出。
 *
 * 规则（“死逻辑 + 伪随机”）：
 *  1. rawId = 只按风格标签推断的人格（即 inferPersona 的结果）。
 *  2. 每个结局有一张“兼容人格表”（personaRules.ts）：这个结局下哪些人格说得通。
 *  3. rawId 在兼容表里 → 候选就是 rawId；不在（与结局矛盾）→ 在兼容表里用本局种子做
 *     伪随机加权选一个候选。权重偏向本局标签次数更多的人格。
 *  4. 压低热门人格：候选人格若是热门（见 engine.ts 的 PERSONA_KEEP_RATE，例如 fox、hedgehog），
 *     就以“1 - 保留率”的概率用本局种子换成同结局兼容的别的人格。
 *  5. 最终 id === rawId → source = 'tally'；否则 source = 'seeded'（含压低热门造成的换牌，
 *     此时 rawId 可能仍在兼容表里）。同一局永远得到同一结果。
 *  所以：最终 id 永远属于该结局的兼容表。
 */
export interface ResolvedPersona {
  readonly id: PersonaId;
  /** 仅按标签推断的人格，可能与结局矛盾。界面一般不展示，仅用于文案判断。 */
  readonly rawId: PersonaId;
  readonly source: 'tally' | 'seeded';
  /** 最终人格对应风格标签在本局出现的次数（真实计数，可以为 0）。 */
  readonly count: number;
  /** 本局全部风格标签总数。 */
  readonly total: number;
  /** 最终人格对应标签是否为本局次数最多（含并列）且 count > 0。 */
  readonly isTop: boolean;
  /** 最终人格对应标签是否与别的标签并列最高。 */
  readonly isTied: boolean;
}

/** 人物卡 id，和 frontend/src/profile/persona.ts 的 PersonaId 一致。 */
export type PersonaId = 'sloth' | 'bull' | 'hedgehog' | 'owl' | 'shark' | 'turtle' | 'dolphin' | 'crab' | 'fox';
