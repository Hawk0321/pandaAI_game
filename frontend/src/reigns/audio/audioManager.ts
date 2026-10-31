/**
 * audioManager：Reigns 交易游戏的音频单例，严格遵守 ./audioTypes.ts 的 AudioManager 契约。
 *
 * - BGM：HTMLAudioElement -> MediaElementSource -> 曲目 GainNode -> 低通滤波 -> BGM 总线 GainNode -> destination。
 *   用 media element 是为了拿到免费的循环、暂停续播和按格式回退；用 Web Audio 是为了交叉淡入淡出和滤波。
 * - SFX：每次 new Audio()，可重叠，播完销毁。
 * - 用户手势（unlock）之前绝不创建 AudioContext，也不创建任何 Audio 元素。
 * - 所有失败（缺文件、解码失败、自动播放被拦）只 console.warn 一次，绝不抛错。
 */
import {
  AUDIO_STORAGE_KEY,
  AVAILABLE_BGM,
  AVAILABLE_SFX,
  DEFAULT_AUDIO_SETTINGS,
  type AudioManager,
  type AudioSettings,
  type BgmId,
  type SfxId,
} from './audioTypes';

/**
 * 音频文件所在位置：public/audio/。用 Vite 注入的 BASE_URL 拼接，而不是页面相对路径，
 * 这样无论页面在 /、/src/reigns/demo.html 还是子路径部署都能找到。
 * dev 下 BASE_URL 是 '/'；构建后是 vite.config.ts 里的 base（'./'，相对 index.html，正确）。
 */
function audioUrl(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}audio/${path}`;
}

const FADE_MS = 600;
const FILTER_FADE_MS = 300;
const TENSION_GAIN = Math.pow(10, -2 / 20); // -2 dB
const TENSION_CUTOFF_HZ = 800;
const OPEN_CUTOFF_HZ = 22000;
const ENDING_FALLBACK_LEVEL = 0.6;
const SAFE_PATTERN = /^(bgm-play-.+)-safe$/;

interface Track {
  readonly requested: BgmId;
  readonly file: BgmId;
  readonly level: number;
  readonly el: HTMLAudioElement;
  readonly gain: GainNode;
  readonly filter: BiquadFilterNode;
  readonly nodes: readonly AudioNode[];
  filtered: boolean;
  disposed: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

interface Resolved {
  readonly file: BgmId;
  readonly level: number;
}

type AudioContextCtor = typeof AudioContext;

function clamp01(v: number, fallback: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function loadSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return DEFAULT_AUDIO_SETTINGS;
    const p = JSON.parse(raw) as Partial<AudioSettings> | null;
    if (!p || typeof p !== 'object') return DEFAULT_AUDIO_SETTINGS;
    return {
      muted: typeof p.muted === 'boolean' ? p.muted : DEFAULT_AUDIO_SETTINGS.muted,
      bgmVolume: clamp01(Number(p.bgmVolume), DEFAULT_AUDIO_SETTINGS.bgmVolume),
      sfxVolume: clamp01(Number(p.sfxVolume), DEFAULT_AUDIO_SETTINGS.sfxVolume),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

function saveSettings(s: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* 隐私模式或存储被禁用：忽略，设置只在本次会话有效 */
  }
}

/** 格式检测：不支持 ogg/vorbis 就只走 mp3，否则先 ogg 后 mp3。 */
function detectExts(): readonly string[] {
  try {
    const canOgg = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
    return canOgg ? ['ogg', 'mp3'] : ['mp3'];
  } catch {
    return ['ogg', 'mp3'];
  }
}

class AudioManagerImpl implements AudioManager {
  private settings: AudioSettings = loadSettings();
  private readonly listeners = new Set<(s: AudioSettings) => void>();
  private readonly warned = new Set<string>();
  private readonly failed = new Set<BgmId>();
  private exts: readonly string[] | null = null;

  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private unlocked = false;

  private wanted: BgmId | null = null;
  private tension = false;
  private current: Track | null = null;
  private readonly live = new Set<Track>();

  constructor() {
    try {
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', this.onVisibility);
      }
    } catch {
      /* 非浏览器环境 */
    }
  }

  // ---------- 公共接口 ----------

  unlock(): void {
    try {
      if (!this.ensureContext()) return;
      const ctx = this.ctx as AudioContext;
      if (ctx.state === 'suspended') {
        ctx.resume().catch((e) => this.warnOnce('resume', 'AudioContext 恢复失败', e));
      }
      this.unlocked = true;
      if (this.wanted && !this.current) this.reconcile();
    } catch (e) {
      this.warnOnce('unlock', 'unlock 失败', e);
    }
  }

  playBgm(id: BgmId): void {
    try {
      this.wanted = id;
      if (!this.unlocked || !this.ctx) return; // 只记录想播的曲子，unlock 后再播
      if (this.current && this.current.requested === id && !this.current.disposed) return;
      this.reconcile();
    } catch (e) {
      this.warnOnce('playBgm', 'playBgm 失败', e);
    }
  }

  stopBgm(fadeMs = 400): void {
    try {
      this.wanted = null;
      const track = this.current;
      this.current = null;
      if (track) this.fadeOut(track, fadeMs);
    } catch (e) {
      this.warnOnce('stopBgm', 'stopBgm 失败', e);
    }
  }

  setTension(on: boolean): void {
    try {
      if (this.tension === on) return;
      this.tension = on;
      if (this.unlocked && this.wanted) this.reconcile();
    } catch (e) {
      this.warnOnce('tension', 'setTension 失败', e);
    }
  }

  playSfx(id: SfxId): void {
    try {
      if (!this.unlocked || this.settings.muted || this.settings.sfxVolume <= 0) return;
      if (!AVAILABLE_SFX.includes(id)) {
        this.warnOnce(`sfx-missing:${id}`, `音效缺失，已跳过：${id}`);
        return;
      }
      const exts = this.getExts();
      const el = new Audio();
      let idx = 0;
      const cleanup = () => {
        el.removeEventListener('ended', cleanup);
        el.removeEventListener('error', onError);
        try {
          el.pause();
          el.removeAttribute('src');
          el.load();
        } catch {
          /* 忽略 */
        }
      };
      const tryNext = () => {
        if (idx >= exts.length) {
          this.warnOnce(`sfx-fail:${id}`, `音效加载失败：${id}`);
          cleanup();
          return;
        }
        el.src = audioUrl(`sfx/${id}.${exts[idx]}`);
        idx += 1;
        el.play()?.catch((e: unknown) => {
          // 自动播放拦截不是文件问题，别继续换格式
          if (e instanceof DOMException && e.name === 'NotAllowedError') {
            this.warnOnce('autoplay-sfx', '浏览器拦截了音效播放', e);
            cleanup();
          }
        });
      };
      const onError = () => tryNext();
      el.volume = this.settings.sfxVolume;
      el.addEventListener('ended', cleanup);
      el.addEventListener('error', onError);
      tryNext();
    } catch (e) {
      this.warnOnce('playSfx', 'playSfx 失败', e);
    }
  }

  setMuted(muted: boolean): void {
    this.update({ ...this.settings, muted });
  }

  setBgmVolume(v: number): void {
    this.update({ ...this.settings, bgmVolume: clamp01(v, this.settings.bgmVolume) });
  }

  setSfxVolume(v: number): void {
    this.update({ ...this.settings, sfxVolume: clamp01(v, this.settings.sfxVolume) });
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  subscribe(fn: (s: AudioSettings) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // ---------- 设置 ----------

  private update(next: AudioSettings): void {
    const changed =
      next.muted !== this.settings.muted ||
      next.bgmVolume !== this.settings.bgmVolume ||
      next.sfxVolume !== this.settings.sfxVolume;
    this.settings = next;
    saveSettings(next);
    this.applyBusVolume();
    if (!changed) return;
    for (const fn of [...this.listeners]) {
      try {
        fn({ ...next });
      } catch (e) {
        this.warnOnce('listener', '设置订阅者抛错', e);
      }
    }
  }

  private applyBusVolume(): void {
    if (!this.ctx || !this.bus) return;
    try {
      const target = this.settings.muted ? 0 : this.settings.bgmVolume;
      this.bus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
    } catch {
      /* 忽略 */
    }
  }

  // ---------- BGM 核心 ----------

  private ensureContext(): boolean {
    if (this.ctx) return true;
    const Ctor: AudioContextCtor | undefined =
      typeof window === 'undefined'
        ? undefined
        : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) {
      this.warnOnce('no-ctx', '当前环境不支持 Web Audio，音乐已关闭');
      return false;
    }
    const ctx = new Ctor();
    const bus = ctx.createGain();
    bus.gain.value = this.settings.muted ? 0 : this.settings.bgmVolume;
    bus.connect(ctx.destination);
    this.ctx = ctx;
    this.bus = bus;
    return true;
  }

  private getExts(): readonly string[] {
    if (!this.exts) this.exts = detectExts();
    return this.exts;
  }

  private usable(id: BgmId): boolean {
    return AVAILABLE_BGM.includes(id) && !this.failed.has(id);
  }

  /** 把“想播的曲子”结合紧张层状态，解析成真正要放的文件。 */
  private resolve(requested: BgmId): Resolved | null {
    const safe = SAFE_PATTERN.exec(requested);
    if (safe) {
      const tense = `${safe[1]}-tense` as BgmId;
      if (this.tension && this.usable(tense)) return { file: tense, level: 1 };
      return this.usable(requested) ? { file: requested, level: 1 } : null;
    }
    if (this.usable(requested)) return { file: requested, level: 1 };
    if (requested === 'bgm-ending-idle' && this.usable('bgm-select')) {
      return { file: 'bgm-select', level: ENDING_FALLBACK_LEVEL };
    }
    this.warnOnce(`bgm-missing:${requested}`, `音乐缺失，已跳过：${requested}`);
    return null;
  }

  /** 紧张层但没有 tense 文件：停在 safe 曲上，改用降 2dB + 800Hz 低通。 */
  private wantsFilter(requested: BgmId, file: BgmId): boolean {
    return this.tension && SAFE_PATTERN.test(requested) && file === requested;
  }

  private reconcile(): void {
    const requested = this.wanted;
    if (!requested || !this.ctx) return;
    const resolved = this.resolve(requested);
    const cur = this.current;
    if (!resolved) {
      if (cur) {
        this.current = null;
        this.fadeOut(cur, FADE_MS);
      }
      return;
    }
    const filtered = this.wantsFilter(requested, resolved.file);
    if (cur && !cur.disposed && cur.file === resolved.file && cur.requested === requested) {
      if (cur.filtered !== filtered) this.setFiltered(cur, filtered);
      return; // safe->safe / tense->tense：什么都不做
    }
    const next = this.startTrack(requested, resolved, filtered);
    if (cur) this.fadeOut(cur, FADE_MS);
    this.current = next;
  }

  private startTrack(requested: BgmId, resolved: Resolved, filtered: boolean): Track | null {
    const ctx = this.ctx as AudioContext;
    const bus = this.bus as GainNode;
    const el = new Audio();
    el.loop = true;
    el.preload = 'auto';

    const source = ctx.createMediaElementSource(el);
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.value = filtered ? TENSION_CUTOFF_HZ : this.openCutoff();
    source.connect(gain);
    gain.connect(filter);
    filter.connect(bus);

    const track: Track = {
      requested,
      file: resolved.file,
      level: resolved.level,
      el,
      gain,
      filter,
      nodes: [source, gain, filter],
      filtered,
      disposed: false,
      timer: null,
    };
    this.live.add(track);

    // 淡入
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.trackLevel(track), now + FADE_MS / 1000);

    // 按格式依次尝试，全部失败才算坏文件
    const exts = this.getExts();
    let idx = 0;
    const tryNext = () => {
      if (track.disposed) return;
      if (idx >= exts.length) {
        this.onTrackFailed(track);
        return;
      }
      el.src = audioUrl(`${resolved.file}.${exts[idx]}`);
      idx += 1;
      this.playElement(track);
    };
    el.addEventListener('error', tryNext);
    tryNext();
    return track;
  }

  private playElement(track: Track): void {
    if (typeof document !== 'undefined' && document.hidden) return; // 回到前台时由 onVisibility 接着播
    track.el.play()?.catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return; // 被新的 src 打断，正常
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        this.warnOnce('autoplay-bgm', '浏览器拦截了音乐自动播放，等待下一次用户操作', e);
        return;
      }
      // 其他错误（解码失败等）交给 element 的 error 事件换格式
    });
  }

  private onTrackFailed(track: Track): void {
    this.warnOnce(`bgm-fail:${track.file}`, `音乐加载失败：${track.file}`);
    this.failed.add(track.file);
    if (this.current === track) {
      this.current = null;
      this.dispose(track);
      this.reconcile(); // 例如 tense 坏了就退回 safe + 滤波
    } else {
      this.dispose(track);
    }
  }

  private trackLevel(track: Track): number {
    return track.level * (track.filtered ? TENSION_GAIN : 1);
  }

  private openCutoff(): number {
    const nyquist = this.ctx ? this.ctx.sampleRate / 2 : OPEN_CUTOFF_HZ;
    return Math.min(OPEN_CUTOFF_HZ, nyquist);
  }

  private setFiltered(track: Track, filtered: boolean): void {
    const ctx = this.ctx as AudioContext;
    track.filtered = filtered;
    const now = ctx.currentTime;
    const g = track.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.trackLevel(track), now + FILTER_FADE_MS / 1000);
    track.filter.frequency.cancelScheduledValues(now);
    track.filter.frequency.setTargetAtTime(filtered ? TENSION_CUTOFF_HZ : this.openCutoff(), now, 0.1);
  }

  private fadeOut(track: Track, ms: number): void {
    const ctx = this.ctx;
    if (!ctx || track.disposed) return;
    const now = ctx.currentTime;
    const g = track.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(ms, 0) / 1000);
    if (track.timer) clearTimeout(track.timer);
    track.timer = setTimeout(() => this.dispose(track), Math.max(ms, 0) + 80);
  }

  private dispose(track: Track): void {
    if (track.disposed) return;
    track.disposed = true;
    if (track.timer) clearTimeout(track.timer);
    track.timer = null;
    this.live.delete(track);
    try {
      track.el.pause();
      track.el.removeAttribute('src');
      track.el.load();
    } catch {
      /* 忽略 */
    }
    for (const n of track.nodes) {
      try {
        n.disconnect();
      } catch {
        /* 忽略 */
      }
    }
  }

  // ---------- 页面可见性 ----------

  private readonly onVisibility = (): void => {
    try {
      if (document.hidden) {
        for (const t of this.live) t.el.pause(); // 保留 currentTime，回来接着播
      } else {
        const cur = this.current;
        if (cur && !cur.disposed && cur.el.paused && cur.el.src) this.playElement(cur);
        if (this.ctx?.state === 'suspended' && this.unlocked) {
          this.ctx.resume().catch((e) => this.warnOnce('resume', 'AudioContext 恢复失败', e));
        }
      }
    } catch (e) {
      this.warnOnce('visibility', 'visibilitychange 处理失败', e);
    }
  };

  // ---------- 工具 ----------

  private warnOnce(key: string, msg: string, err?: unknown): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    if (err === undefined) console.warn(`[audio] ${msg}`);
    else console.warn(`[audio] ${msg}`, err);
  }
}

export const audio: AudioManager = new AudioManagerImpl();
