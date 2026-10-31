// 交易滑牌：Reigns 类玩法界面。卡牌内容与引擎见 cards.ts / engine.ts，全部为示例内容（is_sample）。
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { ALL_CARDS } from './allCards';
import { EndingScreen } from './EndingScreen';
import { choose, createGame, previewEffects } from './engine';
import { RoleSelect } from './RoleSelect';
import { ROLES } from './roles';
import { STAT_KEYS } from './types';
import type { GameState, RoleId, Side, StatKey } from './types';
import './reigns.css';

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

  // 每次选完出现新的“后来……”，停几秒后淡出。
  useEffect(() => {
    if (!game?.lastAftermath) { setAftermathShown(false); return undefined; }
    setAftermathShown(true);
    const id = window.setTimeout(() => setAftermathShown(false), AFTERMATH_MS);
    return () => window.clearTimeout(id);
  }, [game?.lastAftermath, game?.turn]);

  const commit = useCallback((side: Side) => {
    if (exiting || !game || game.ending || !game.current) return;
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
  const start = (role: RoleId) => { setGame(newGame(role)); setBackToSelect(false); resetCard(); };
  /** “再来一局”：回到选角页。 */
  const restart = () => { setGame(null); setBackToSelect(true); resetCard(); };
  /** 同一角色再来一次。 */
  const replay = () => { if (game) start(game.role); };

  if (!game) {
    return (
      <section className="reigns-root" aria-label="交易滑牌">
        <header className="reigns-header">
          <h1 className="reigns-title">交易滑牌</h1>
          <p className="reigns-turn"><span className="reigns-sample">示例内容</span></p>
        </header>
        <RoleSelect onSelect={start} focusHeading={backToSelect} />
      </section>
    );
  }

  const roleDef = ROLES[game.role];
  const card = game.current;
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
    <section className="reigns-root" aria-label="交易滑牌">
      <header className="reigns-header">
        <h1 className="reigns-title">交易滑牌 <span className="reigns-role-chip">{roleDef.emoji} {roleDef.name}</span></h1>
        <p className="reigns-turn">{game.ending ? `共 ${game.turn} 回合` : `第 ${game.turn + 1} 回合`} <span className="reigns-sample">示例内容</span></p>
      </header>

      {!game.ending && (
        <>
          <ul className="reigns-stats" aria-label="当前数值">
            {STAT_KEYS.map((key) => {
              const value = game.stats[key];
              const def = roleDef.stats[key];
              const low = value <= 20 || value >= 80;
              const open = openStat === key;
              return (
                <li key={key} className="reigns-stat">
                  <button
                    type="button"
                    className="reigns-stat-name"
                    title={def.meaning}
                    aria-expanded={open}
                    aria-controls="reigns-stat-meaning"
                    onClick={() => setOpenStat(open ? null : key)}
                  >
                    {def.label}
                  </button>
                  <span className="reigns-dot-slot" aria-hidden="true">
                    {affected.includes(key) && <span className="reigns-dot" />}
                  </span>
                  <div className="reigns-bar" role="meter" aria-label={def.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
                    <div className={`reigns-bar-fill${low ? ' reigns-bar-danger' : ''}`} style={{ width: `${value}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p id="reigns-stat-meaning" className="reigns-stat-meaning" hidden={openStat === null}>
            {openStat && <><strong>{roleDef.stats[openStat].label}</strong>：{roleDef.stats[openStat].meaning}</>}
          </p>
        </>
      )}

      {game.ending ? (
        <EndingScreen state={game} onRestart={restart} onReplay={replay} />
      ) : card && (
        <>
          <div className="reigns-stage">
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
              <div className="reigns-card-body" aria-live="polite" aria-atomic="true">
                <p className="reigns-speaker">{card.speaker}</p>
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
                <span className="reigns-arrow" aria-hidden="true">{side === 'left' ? '←' : '→'}</span>
                <span>{card[side].label}</span>
              </button>
            ))}
          </div>
          <p className="reigns-help">拖动卡牌，或按 ← → 键选择</p>
        </>
      )}
    </section>
  );
}
