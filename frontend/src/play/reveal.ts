/**
 * 揭晓动画的纯函数部分：K 线逐根出现的节奏，以及"减少动态"偏好的判断。
 * 只管"第几根该显示了"，不碰事件、账户和止损逻辑——那些在 PlayLevel 里按整段行情一次算完。
 */
export const REVEAL_BAR_MS = 150;

/** 系统开了"减少动态效果"就不做逐根动画，整段行情一次显示。测试环境没有 matchMedia，视为未开启。 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 从已显示 from 根逐根揭晓到 to 根：每隔 perBarMs 调一次 onTick(当前应显示的根数)，最后一次传 to。
 * reduced 为真（或没有新根）时立即 onTick(to)。返回取消函数，取消后不再回调。
 */
export function scheduleReveal(
  from: number, to: number, onTick: (shown: number) => void,
  options: { perBarMs?: number; reduced?: boolean } = {},
): () => void {
  const perBarMs = options.perBarMs ?? REVEAL_BAR_MS;
  if (options.reduced || to <= from) { onTick(to); return () => {}; }
  let shown = from;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    shown += 1;
    timer = shown < to ? setTimeout(tick, perBarMs) : null;
    onTick(shown);
  };
  timer = setTimeout(tick, perBarMs);
  return () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
}
