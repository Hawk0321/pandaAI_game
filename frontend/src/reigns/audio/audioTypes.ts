/**
 * 音频共享约定：三个并行任务（素材、audioManager、界面接入）都只依赖这个文件。
 * 规格来源：docs/reigns-assets/03-music-and-sfx.md。素材许可见 docs/audio-credits.md。
 */

/** 背景音乐 id；文件为 public/audio/<id>.ogg，缺 .ogg 时回退 .mp3。 */
export type BgmId =
  | 'bgm-select'
  | 'bgm-play-fund-safe'
  | 'bgm-play-fund-tense'
  | 'bgm-play-crypto-safe'
  | 'bgm-play-crypto-tense'
  | 'bgm-play-stock-safe'
  | 'bgm-play-stock-tense'
  | 'bgm-ending-idle';

/** 音效 id；文件为 public/audio/sfx/<id>.ogg，缺 .ogg 时回退 .mp3。 */
export type SfxId =
  | 'sfx-card-grab'
  | 'sfx-card-left'
  | 'sfx-card-right'
  | 'sfx-card-enter'
  | 'sfx-stat-danger'
  | 'sfx-final-low'
  | 'sfx-final-high'
  | 'sfx-btn-click'
  | 'sfx-role-confirm'
  | 'sfx-secret-unlock'
  | 'sfx-persona-flip'
  | 'sfx-restart';

export type AudioId = BgmId | SfxId;

/** 当前已有的文件（素材组增删后更新这里，audioManager 以此为准，缺文件的 id 静默跳过）。 */
export const AVAILABLE_BGM: readonly BgmId[] = [
  'bgm-select',
  'bgm-play-fund-safe',
  'bgm-play-fund-tense',
  'bgm-play-crypto-safe',
  'bgm-play-crypto-tense',
  'bgm-play-stock-safe',
  'bgm-play-stock-tense',
  'bgm-ending-idle',
];

export const AVAILABLE_SFX: readonly SfxId[] = [
  'sfx-card-grab',
  'sfx-card-left',
  'sfx-card-right',
  'sfx-card-enter',
  'sfx-stat-danger',
  'sfx-final-low',
  'sfx-final-high',
  'sfx-btn-click',
  'sfx-role-confirm',
  'sfx-secret-unlock',
  'sfx-persona-flip',
  'sfx-restart',
];

/** localStorage 键；读写必须 try/catch，读不到就用默认值。 */
export const AUDIO_STORAGE_KEY = 'reigns-audio-v1';

export interface AudioSettings {
  /** 总静音；默认 false（音乐默认开启，右上角有静音键）。 */
  readonly muted: boolean;
  /** 0–1，默认 0.5。 */
  readonly bgmVolume: number;
  /** 0–1，默认 0.8。 */
  readonly sfxVolume: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, bgmVolume: 0.5, sfxVolume: 0.8 };

/**
 * audioManager 对外接口（audio/audioManager.ts 必须导出同名单例 audio）。
 * 全部方法在缺文件、解码失败、浏览器拦截自动播放时静默失败，只 console.warn 一次，绝不抛错、绝不阻塞游戏。
 *
 * - unlock()：在第一次用户手势（点击、按键、触摸）里调用，创建/恢复 AudioContext。重复调用安全。
 *   浏览器自动播放限制：unlock 之前 playBgm 只记录“想播的曲子”，unlock 后立刻开始播。
 * - playBgm(id)：交叉淡入淡出 600ms 切到 id；id 相同则什么都不做；循环播放。
 * - stopBgm(fadeMs?)：淡出停止，默认 400ms。
 * - setTension(on)：紧张层开关。仅对有 safe/tense 成对的曲目生效：on=true 时把当前
 *   bgm-play-<role>-safe 切到 bgm-play-<role>-tense；on=false 切回 safe。tense 文件不存在时
 *   退化为“当前 BGM 音量降 2 dB + 低通滤波”，不换曲子。
 * - playSfx(id)：一次性播放，可重叠，用 sfxVolume。
 * - setMuted(muted) / setBgmVolume(v) / setSfxVolume(v)：改设置并写入 localStorage。
 * - getSettings()：返回当前设置的拷贝。subscribe(fn)：设置变化时回调，返回取消订阅函数。
 * - pageHidden：文档 visibilitychange 为 hidden 时自动暂停 BGM，回来恢复（manager 内部处理）。
 */
export interface AudioManager {
  unlock(): void;
  playBgm(id: BgmId): void;
  stopBgm(fadeMs?: number): void;
  setTension(on: boolean): void;
  playSfx(id: SfxId): void;
  setMuted(muted: boolean): void;
  setBgmVolume(v: number): void;
  setSfxVolume(v: number): void;
  getSettings(): AudioSettings;
  subscribe(fn: (s: AudioSettings) => void): () => void;
}

/**
 * 界面该放哪首曲子（给接入组用，纯函数在 audio/bgmPlan.ts 实现，便于单测）：
 *   选角页            → bgm-select
 *   游戏中            → bgm-play-<role>-safe；任一属性 <= ENDING_THRESHOLDS.low 或 >= ENDING_THRESHOLDS.high
 *                       （阈值直接 import 自 ../endings，不要另写常量）→ setTension(true)，回到安全区 → setTension(false)
 *   结局页            → bgm-ending-idle（没有该文件时沿用 bgm-select，音量由 manager 降低）
 */
