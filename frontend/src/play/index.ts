import { createElement, useEffect, useRef, useState } from "react";
import type { PlayLevelProps } from "../shared/protocol";

export type { PlayLevelProps } from "../shared/protocol";

/** 临时占位组件：由 B 替换；只发观望事件，不模拟真实交易。 */
export function PlayLevel({ level, isSupplementary, loadReveal, emit, onDone }: PlayLevelProps): JSX.Element {
  const startedLevel = useRef<string | null>(null);
  const startedAt = useRef(0);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (startedLevel.current === level.id) return;
    startedLevel.current = level.id;
    startedAt.current = performance.now();
    emit("level_start", { budget: level.budget, is_supplementary: isSupplementary });
  }, [level.id, level.budget, isSupplementary, emit]);

  async function finishPlaceholder(): Promise<void> {
    if (running.current || error) return;
    running.current = true;
    setBusy(true);
    try {
      emit("decision", {
        side: "flat",
        size: 0,
        confidence: 3,
        stop: null,
        clues_opened: [],
        think_ms: Math.max(0, Math.round(performance.now() - startedAt.current)),
      });
      // 信息隔离：提交 decision 之后才请求揭晓文件。
      await loadReveal();
      for (const step of [1, 2, 3]) {
        emit("hold_step", { step, pnl_before: 0, action: "hold", position_after: 0 });
      }
      emit("level_end", { pnl: 0, final_position: 0 });
      onDone({ level_id: level.id, pnl: 0, final_position: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  return createElement(
    "section",
    { className: "play-placeholder", "aria-label": "对局玩法占位" },
    createElement("p", { className: "eyebrow" }, isSupplementary ? "补充关卡" : "正式关卡"),
    createElement("h2", null, level.masked_name),
    createElement("p", null, "玩法尚未接入。此占位按钮提交观望决定，依次记录三步持有事件，再进入揭晓页。"),
    createElement("p", null, "占位结果固定为 0，不代表模拟交易表现。"),
    createElement("button", { type: "button", disabled: busy || error !== null, onClick: () => { void finishPlaceholder(); } }, busy ? "正在加载揭晓…" : "提交观望，查看揭晓"),
    error === null ? null : createElement("div", { role: "alert" },
      createElement("p", null, "加载失败，流程已停止。请将以下错误反馈给负责人："),
      createElement("pre", null, error),
    ),
  );
}
