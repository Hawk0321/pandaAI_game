// 交易滑牌：Reigns 类玩法界面。卡牌内容与引擎见 cards.ts / engine.ts，全部为示例内容（is_sample）。
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ALL_CARDS } from './allCards';
import { EndingScreen } from './EndingScreen';
import { choose, createGame, previewEffects } from './engine';
import { RoleSelect } from './RoleSelect';
import { ROLES } from './roles';
import { characterArtwork, selfArtwork } from './characterArt';
import { hintIcon, statIcon } from './uiArt';
import { STAT_KEYS } from './types';
import type { GameState, RoleId, Side, StatKey } from './types';
import { audio } from './audio/audioManager';
import { finalSfxFor, isInDanger, newlyDangerous, playBgmFor } from './audio/bgmPlan';
import { MuteButton } from './audio/MuteButton';
import { useAudioUnlock } from './audio/useAudioUnlock';
import { ROLE_SCENES, SCENE_COPY } from './sceneArt';
import './reigns.css';
import './card-motion.css';

/** 位移超过卡宽的这个比例，松手即算选择。 */
const COMMIT_RATIO = 0.3;
/** 滑出动画时长（毫秒），减少动态效果时为 0。 */
const EXIT_MS = 220;
/** 超过这个位移才开始显示提示，避免点按误触。 */
const HINT_MIN_PX = 8;
const MAX_ROTATE_DEG = 12;

const sideName: Record<Side, string> = { left: '左', right: '右' };

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** “后来……”这行字停留多久（毫秒），超时或下一次拖动就淡出。 */
const AFTERMATH_MS = 6000;

/** 每局用新的 seed 洗牌。 */
const newGame = (role: RoleId): GameState => createGame(ALL_CARDS, Date.now() % 2147483647, role);

export function ReignsGame() {
  // 状态机：select（选角）→ playing（game 非空且未结束）→ ending（game.ending 非空）。
  const [game, setGame] = useState<GameState | null>(null);
  const [backToSelect, setBackToSelect] = useState(false);
  const [openStat, setOpenStat] = useState<StatKey | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<Side | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const [aftermathShown, setAftermathShown] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 音频：第一次手势时解锁；选角页的音乐由 RoleSelect 自己放。
  useAudioUnlock();
  /** 上一次是否在危险区：只在边界切换时调用 setTension。 */
  const dangerRef = useRef(false);
  /** 上一次的数值，用来找出“首次进入危险区”的那一项。 */
  const prevStatsRef = useRef<GameState['stats'] | null>(null);
  /** 已经播过结局音效的结局，防止 StrictMode 重复执行副作用时放两遍。 */
  const endedRef = useRef<GameState['ending']>(null);
  const setTension = (on: boolean) => {
    if (dangerRef.current === on) return;
    dangerRef.current = on;
    audio.setTension(on);
  };

  const inPlay = game !== null && game.ending === null;
  const playRole = game?.role ?? null;
  useEffect(() => {
    if (inPlay && playRole) audio.playBgm(playBgmFor(playRole));
  }, [inPlay, playRole]);

  // 每次 state 更新后检查危险区。
  useEffect(() => {
    if (!game) return;
    if (game.ending) {
      if (endedRef.current === game.ending) return;
      endedRef.current = game.ending;
      setTension(false);
      prevStatsRef.current = null;
      const sfx = finalSfxFor(game.stats);
      if (sfx) audio.playSfx(sfx);
      audio.stopBgm();
      return;
    }
    const prev = prevStatsRef.current;
    if (prev && newlyDangerous(prev, game.stats).length > 0) audio.playSfx('sfx-stat-danger');
    prevStatsRef.current = game.stats;
    setTension(isInDanger(game.stats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // 新卡牌进入（第一张卡由“确认角色”的音效覆盖，不重复响）。
  const turn = game?.turn ?? 0;
  useEffect(() => {
    if (inPlay && turn > 0) audio.playSfx('sfx-card-enter');
  }, [inPlay, turn]);

  // 每次选完出现新的“后来……”，停几秒后淡出。
  useEffect(() => {
    if (!game?.lastAftermath) { setAftermathShown(false); return undefined; }
    setAftermathShown(true);
    const id = window.setTimeout(() => setAftermathShown(false), AFTERMATH_MS);
    return () => window.clearTimeout(id);
  }, [game?.lastAftermath, game?.turn]);

  const commit = useCallback((side: Side) => {
    if (exiting || !game || game.ending || !game.current) return;
    audio.playSfx(side === 'left' ? 'sfx-card-left' : 'sfx-card-right');
    setDragging(false);
    setExiting(side);
    const apply = () => {
      setGame((prev) => (prev ? choose(prev, side, ALL_CARDS) : prev));
      setExiting(null);
      setDx(0);
    };
    const ms = prefersReducedMotion() ? 0 : EXIT_MS;
    if (ms === 0) apply();
    else timer.current = window.setTimeout(apply, ms);
  }, [exiting, game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); commit('left'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); commit('right'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit]);

  const cardWidth = () => cardRef.current?.offsetWidth ?? 300;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (exiting || e.button > 0) return;
    audio.playSfx('sfx-card-grab');
    e.currentTarget.setPointerCapture(e.pointerId);
    setAftermathShown(false);
    startX.current = e.clientX - dx;
    setDragging(true);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDx(e.clientX - startX.current);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const threshold = cardWidth() * COMMIT_RATIO;
    if (Math.abs(dx) >= threshold) commit(dx < 0 ? 'left' : 'right');
    else { setDragging(false); setDx(0); }
  };
  const onPointerCancel = () => { setDragging(false); setDx(0); };

  const resetCard = () => { setDx(0); setDragging(false); setExiting(null); setAftermathShown(false); setOpenStat(null); };
  const resetAudioState = () => { setTension(false); prevStatsRef.current = null; endedRef.current = null; };
  const start = (role: RoleId) => { resetAudioState(); setGame(newGame(role)); setBackToSelect(false); resetCard(); };
  /** “再来一局”：回到选角页。 */
  const restart = () => { resetAudioState(); setGame(null); setBackToSelect(true); resetCard(); };
  /** 同一角色再来一次。 */
  const replay = () => { if (game) start(game.role); };

  if (!game) {
    return (
      <div className="reigns-scene reigns-scene-select">
        <div className="reigns-ambient" aria-hidden="true"><span /><span /><span /></div>
        <section className="reigns-root" aria-label="交易滑牌">
          <header className="reigns-header">
            <h1 className="reigns-title"><span className="reigns-brand-mark">P</span>交易滑牌</h1>
            <p className="reigns-turn"><span className="reigns-sample">示例内容</span></p>
            <MuteButton />
          </header>
          <div className="reigns-scene-intro">
            <p>{SCENE_COPY.select.kicker}</p><h2>{SCENE_COPY.select.title}</h2><span>{SCENE_COPY.select.subtitle}</span>
          </div>
          <RoleSelect onSelect={start} focusHeading={backToSelect} />
        </section>
      </div>
    );
  }

  const roleDef = ROLES[game.role];
  const scene = ROLE_SCENES[game.role];
  const card = game.current;
  const cardArtwork = card?.speaker === '自己' ? selfArtwork(game.role) : card ? characterArtwork(card.speaker) : undefined;
  const leaning: Side | null = exiting ?? (Math.abs(dx) > HINT_MIN_PX ? (dx < 0 ? 'left' : 'right') : null);
  const affected: readonly StatKey[] = leaning && card ? previewEffects(game, leaning) : [];

  const threshold = cardWidth() * COMMIT_RATIO;
  const progress = Math.min(1, Math.abs(dx) / threshold);
  const exitX = exiting ? (exiting === 'left' ? -1 : 1) * cardWidth() * 1.4 : dx;
  const rotate = Math.max(-1, Math.min(1, exitX / cardWidth())) * MAX_ROTATE_DEG;
  const cardStyle: CSSProperties = {
    transform: `translateX(${exitX}px) rotate(${rotate}deg)`,
    transition: dragging ? 'none' : `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS}ms ease-out`,
    opacity: exiting ? 0 : 1,
  };
  const labelOpacity = (side: Side) => (exiting === side ? 1 : leaning === side ? progress : 0);

  const onCardKey = (e: ReactKeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); };

  return (
    <div className={`reigns-scene reigns-scene-${game.role}${game.ending ? ' reigns-scene-ending' : ''}`}>
      <div className="reigns-ambient" aria-hidden="true"><span /><span /><span /></div>
      <aside className="reigns-scene-rail" aria-hidden="true"><b>{scene.code}</b><span>{scene.location}</span><i /></aside>
      <section className="reigns-root" aria-label="交易滑牌">
        <header className="reigns-header">
          <h1 className="reigns-title"><span className="reigns-brand-mark">P</span><span>交易滑牌 <span className="reigns-role-chip">{roleDef.name}</span></span></h1>
          <p className="reigns-turn"><span className="reigns-turn-number">{String(game.turn + 1).padStart(2, '0')}</span><span>/ 40</span><span className="reigns-sample">示例内容</span></p>
          <MuteButton />
        </header>
        {!game.ending && <div className="reigns-chapter"><span>{scene.location}</span><i /> <span>{scene.chapter}</span></div>}

        {!game.ending && (
        <section className="reigns-console" aria-label="本局控制台">
          <ul className="reigns-stats" aria-label="当前数值">
            {STAT_KEYS.map((key) => {
              const value = game.stats[key];
              const def = roleDef.stats[key];
              const low = value <= 20 || value >= 80;
              const open = openStat === key;
              return (
                <li key={key} className={`reigns-stat${low ? ' reigns-stat-danger' : ''}${affected.includes(key) ? ' reigns-stat-affected' : ''}`}>
                  <div className="reigns-stat-heading"><img className="reigns-stat-icon" src={statIcon(game.role, key, value)} alt="" width="32" height="32" /><strong>{value}</strong></div>
                  <button type="button" className="reigns-stat-name" title={def.meaning} aria-expanded={open} aria-controls="reigns-stat-meaning" onClick={() => setOpenStat(open ? null : key)}>{def.label}</button>
                  <span className="reigns-dot-slot" aria-hidden="true">{affected.includes(key) && <img className="reigns-hint-icon" src={hintIcon(key)} alt="" width="12" height="12" />}</span>
                  <div className="reigns-bar" role="meter" aria-label={def.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className={`reigns-bar-fill${low ? ' reigns-bar-danger' : ''}`} style={{ width: `${value}%` }} /></div>
                </li>
              );
            })}
          </ul>
          <p id="reigns-stat-meaning" className="reigns-stat-meaning" hidden={openStat === null}>
            {openStat && <><strong>{roleDef.stats[openStat].label}</strong>：{roleDef.stats[openStat].meaning}</>}
          </p>
        </section>
      )}

      {game.ending ? (
        <EndingScreen state={game} onRestart={restart} onReplay={replay} />
      ) : card && (
        <main className="reigns-play">
          <div className={`reigns-stage${leaning ? ` reigns-stage-${leaning}` : ''}`}>
            <div className="reigns-card-shadow reigns-card-shadow-one" aria-hidden="true" />
            <div className="reigns-card-shadow reigns-card-shadow-two" aria-hidden="true" />
            <div
              key={`${card.id}-${game.turn}`}
              ref={cardRef}
              className="reigns-card"
              style={cardStyle}
              role="group"
              aria-roledescription="可滑动的卡牌"
              aria-label="事件卡牌，向左或向右拖动，或使用下方按钮、方向键选择"
              tabIndex={0}
              onKeyDown={onCardKey}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
            >
              {card.adventure && <span className="reigns-adv-tag">奇遇</span>}
              <div className="reigns-card-portrait">
                <span className="reigns-card-index">EVENT / {String(game.turn + 1).padStart(2, '0')}</span>
                {cardArtwork && <img className="reigns-speaker-art" src={cardArtwork} alt="" width="144" height="144" />}
                <span className="reigns-card-role">{card.speaker}</span>
              </div>
              <div className="reigns-card-body" aria-live="polite" aria-atomic="true">
                <p className="reigns-speaker">{card.speaker}发来一张决策卡</p>
                <p className="reigns-text">{card.text}</p>
              </div>
              <span className="reigns-hint reigns-hint-left" aria-hidden="true" style={{ opacity: labelOpacity('left') }}>{card.left.label}</span>
              <span className="reigns-hint reigns-hint-right" aria-hidden="true" style={{ opacity: labelOpacity('right') }}>{card.right.label}</span>
            </div>
          </div>

          <p className={`reigns-aftermath${aftermathShown && game.lastAftermath ? ' reigns-aftermath-on' : ''}`} aria-live="polite" aria-atomic="true">
            {game.lastAftermath ? `后来……${game.lastAftermath.replace(/^后来[……。.，, ]*/, '')}` : ''}
          </p>

          <div className="reigns-actions">
            {(['left', 'right'] as const).map((side) => (
              <button
                key={side}
                type="button"
                className={`reigns-choice reigns-choice-${side}`}
                aria-label={`选${sideName[side]}侧：${card[side].label}`}
                disabled={exiting !== null}
                onClick={() => commit(side)}
              >
                <span className="reigns-choice-key" aria-hidden="true">{side === 'left' ? '←' : '→'}</span>
                <span className="reigns-choice-copy"><small>{side === 'left' ? scene.leftLabel : scene.rightLabel}</small><strong>{card[side].label}</strong></span>
                <span className="reigns-choice-tick" aria-hidden="true">{side === 'left' ? 'A' : 'D'}</span>
              </button>
            ))}
          </div>
          <p className="reigns-help"><span>拖动决策卡</span><i /> <span>或使用 A / D 与方向键</span></p>
        </main>
      )}
        {game.ending && <div className="reigns-ending-scene-copy"><p>{SCENE_COPY.ending.kicker}</p><h2>{SCENE_COPY.ending.title}</h2><span>{SCENE_COPY.ending.subtitle}</span></div>}
      </section>
    </div>
  );
}
