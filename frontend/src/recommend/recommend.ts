/**
 * 推荐（规则）：画像 + 本局行为 → 2–4 条推荐，每条带依据的维度判断、证据原文、理由和可点击的下一步。
 * 做深的一类是"练习任务"：本作品内置、当场能玩，用的是真实历史关卡（已揭晓的关或没玩过的关）。
 * 外部资源（PandaAI / QuantSkills）作为配套，链接均已核实。规则说明见 docs/recommend.md。
 */
import type { AnalyzeInput, Dimension, DimensionId, Profile, Recommendation, RecResource, Side } from '../shared/protocol';
import { collectLevels, type LevelFacts } from '../profile/evidence';
import { EXTERNAL, TASKS } from './catalog';

/** 推荐阈值，docs/recommend.md 逐条解释。 */
export const R = {
  weak: 0.45,          // 能力分 ≤ 0.45 视为需要练
  strong: 0.65,        // 能力分 ≥ 0.65 视为已经不错
  watcher: 0.2,        // 风险偏好 ≤ 0.2 视为几乎不入场
  maxTasks: 2,
  maxResources: 2,
};

interface Candidate { rec: Recommendation; priority: number }
type Dims = Record<DimensionId, Dimension>;

const CONF: Record<Dimension['confidence'], string> = { low: '置信度低', medium: '置信度中', high: '置信度高' };
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** 取支持该判断的证据原文（最多 2 条），没有则取任意证据。 */
function quotes(d: Dimension, n = 2): string[] {
  const pro = d.evidence.filter((e) => e.direction === '+').map((e) => e.text);
  const any = d.evidence.map((e) => e.text);
  return (pro.length ? pro : any).slice(0, n);
}
const basis = (d: Dimension) => ({ dimension_id: d.id, judgement: d.judgement, evidence: quotes(d) });
const said = (d: Dimension) => `${d.name}判断为"${d.judgement}"（${CONF[d.confidence]}）`;
const first = (d: Dimension) => (quotes(d, 1)[0] ? `，例如${quotes(d, 1)[0]}` : '');

const isWeak = (d: Dimension) => d.score !== null && d.score <= R.weak;
const isStrong = (d: Dimension) => d.score !== null && d.score >= R.strong;

function task(id: keyof typeof TASKS, title: string, reason: string, based: Dimension[], level_ids: string[], exclude_ids?: string[]): Recommendation {
  const r = TASKS[id];
  const { steps, ...resource } = r;
  return {
    id: `task-${id}`, type: 'task', title, resource, reason, based_on: based.map(basis),
    next_step: { label: `开始练习（${steps.split('→').length} 步）`, kind: 'in_app_task', task: { id, level_ids, ...(exclude_ids ? { exclude_ids } : {}) } },
  };
}
function external(id: string, type: Recommendation['type'], title: string, res: RecResource, reason: string, based: Dimension[], label: string): Recommendation {
  return { id, type, title, resource: res, reason, based_on: based.map(basis), next_step: { label, kind: 'external', url: res.url } };
}

/* ---------------- 选关：练习任务用哪一关 ---------------- */
function decisionOf(f: LevelFacts) {
  const d = f.decision?.data ?? {};
  return { side: (d.side as Side) ?? 'flat', size: num(d.size), stop: d.stop, opened: Array.isArray(d.clues_opened) ? d.clues_opened as string[] : [] };
}
/** 止损演练：优先选"重仓没设止损、方向又做反了"的关，其次选波动最大的关。 */
function stopDrillLevel(facts: LevelFacts[]): string | null {
  const scored = facts.map((f) => {
    const d = decisionOf(f);
    const against = d.side !== 'flat' && ((d.side === 'long') !== (f.reveal.outcome.direction === 'up')) && f.reveal.outcome.direction !== 'flat';
    const noStop = d.side !== 'flat' && d.size >= 0.5 && d.stop === null;
    return { id: f.levelId, s: (noStop ? 2 : 0) + (against ? 1 : 0) + Math.abs(f.reveal.outcome.ret) };
  }).sort((a, b) => b.s - a.s);
  return scored[0]?.id ?? null;
}
/** 关键线索复盘：漏看关键线索最多的关（最多 2 关）。 */
function missedKeyLevels(facts: LevelFacts[]): string[] {
  return facts.map((f) => {
    const d = decisionOf(f);
    const opened = new Set([...d.opened, ...f.clueOpens.map((e) => String(e.data.clue_id))]);
    return { id: f.levelId, miss: f.reveal.key_clue_ids.filter((k) => !opened.has(k)).length };
  }).filter((x) => x.miss > 0).sort((a, b) => b.miss - a.miss).slice(0, 2).map((x) => x.id);
}

/* ---------------- 候选推荐 ---------------- */
function candidates(dims: Dims, facts: LevelFacts[]): Candidate[] {
  const out: Candidate[] = [];
  const { evidence_use: ev, calibration: cal, risk_control: rc, style, research_depth: rd, risk_appetite: ra } = dims;
  const played = facts.map((f) => f.levelId);

  // ---- 练习任务（做深的一类）----
  const stopLevel = stopDrillLevel(facts);
  if (isWeak(rc) && stopLevel) {
    out.push({ priority: 100 - rc.score! * 100, rec: task('stop_drill', '做一次止损演练',
      `${said(rc)}${first(rc)}。在你玩过的真实行情上比一比设不设止损，比讲道理更直观。`, [rc, ra], [stopLevel]) });
  }
  const missed = missedKeyLevels(facts);
  if (isWeak(ev) && missed.length) {
    out.push({ priority: 95 - ev.score! * 100, rec: task('key_clue_drill', '复盘漏看的关键线索',
      `${said(ev)}${first(ev)}。回到那一关把线索全部翻开，练习先找"最有判断价值"的那张。`, [ev, rd], missed) });
  }
  if (cal.score === null || isWeak(cal)) {
    const watcher = ra.score !== null && ra.score <= R.watcher;
    const reason = cal.score === null
      ? `${said(cal)}：${cal.uncertain}。${watcher ? '你几乎都在观望，' : ''}这个小测不用下单，只需判断涨跌并给信心，几分钟就能补上这块证据。`
      : `${said(cal)}${first(cal)}。用 3 段没玩过的真实行情练习"信心要和把握匹配"。`;
    out.push({ priority: cal.score === null ? 90 : 92 - cal.score * 100,
      rec: task('calibration_quiz', cal.score === null ? '用信心小测补上判断校准' : '练习给出靠谱的信心', reason, [cal, ra], [], played) });
  }
  if (facts.some((f) => decisionOf(f).side !== 'flat') && (isStrong(ev) || (style.score !== null && style.confidence !== 'low'))) {
    out.push({ priority: 40 + (isStrong(ev) ? 10 : 0), rec: task('style_match', '找出最像你的交易规则',
      `${isStrong(ev) ? `${said(ev)}，你的决定有迹可循。` : ''}${said(style)}${first(style)}。把你的每关方向和三种经典策略对照，找出可以写成规则的那一条。`,
      isStrong(ev) ? [ev, style] : [style], played) });
  }

  // ---- 外部资源（配套）----
  if (isWeak(rc)) {
    out.push({ priority: 80 - rc.score! * 50, rec: external('res-stop-skill', 'tool', '把止损写成规则', EXTERNAL.stopLossSkill,
      `${said(rc)}。这个技能包按入场价自动执行止损和仓位上限，能把"事前定好最大亏损"变成习惯。`, [rc], '查看技能包') });
  }
  if (isWeak(cal)) {
    out.push({ priority: 75 - cal.score! * 50, rec: external('res-behavior-skill', 'tool', '诊断过度自信等行为偏差', EXTERNAL.behaviorSkill,
      `${said(cal)}${first(cal)}。它从交易记录里识别过度自信等偏差，适合拿真实或模拟盘记录继续检查。`, [cal], '查看技能包') });
  }
  if (isWeak(ev) && rd.score !== null && rd.score <= R.weak) {
    out.push({ priority: 70 - ev.score! * 50, rec: external('res-trade-review', 'tool', '用复盘工具逐笔回看决定', EXTERNAL.tradeReviewSkill,
      `${said(ev)}，${said(rd)}。逐笔复盘能帮你看清每次下单前到底看了什么。`, [ev, rd], '查看技能包') });
  }
  if (ra.score !== null && ra.score <= R.watcher) {
    out.push({ priority: 72, rec: external('res-futures-contest', 'event', '在模拟盘上迈出第一步', EXTERNAL.futuresContest,
      `${said(ra)}${first(ra)}。模拟赛不用真金白银，适合先用小仓位把"看懂了"变成"做一次"。`, [ra], '去看模拟赛') });
  }
  if (style.score !== null && style.score >= R.strong && style.confidence !== 'low' && !style.conflict) {
    out.push({ priority: 55, rec: external('res-trend-template', 'strategy', '试试趋势跟随策略模板', EXTERNAL.qube,
      `${said(style)}${first(style)}。Qube 首页的双均线、海龟突破 + ATR 止损模板就是把"顺势"写成规则，可以直接回测。`, [style], '打开 Qube') });
  } else if (style.score !== null && style.score <= 1 - R.strong && style.confidence !== 'low' && !style.conflict) {
    out.push({ priority: 55, rec: external('res-reversal-skill', 'strategy', '研究超跌反弹的规则', EXTERNAL.oversoldSkill,
      `${said(style)}${first(style)}。这个技能包把"跌多了买"量化成择时和选股条件，能检验你的逆势直觉。`, [style], '查看技能包') });
  }
  if (isStrong(ev) && rd.score !== null && rd.score >= R.strong) {
    out.push({ priority: 60, rec: external('res-qube', 'strategy', '把你的研究习惯变成可回测的策略', EXTERNAL.qube,
      `${said(ev)}，${said(rd)}。你已经习惯先看证据再决定，下一步是把判断写成规则，用历史数据回测。`, [ev, rd], '打开 Qube') });
    out.push({ priority: 50, rec: external('res-overfit', 'tool', '检查规则是否过拟合', EXTERNAL.overfitSkill,
      `${said(ev)}。规则写出来之后，最容易踩的坑是回测过拟合，这个技能包专门检查这一点。`, [ev], '查看技能包') });
  }
  if (rd.score !== null && rd.score <= R.weak) {
    out.push({ priority: 45, rec: external('res-panda-data', 'data', '先学会自己查数据', EXTERNAL.pandaDataSkill,
      `${said(rd)}${first(rd)}。游戏里的线索都来自 Panda Data，这个技能包让 AI 助手帮你一句话查到同样的数据。`, [rd], '查看技能包') });
  }
  if ([ev, cal, rc].every(isStrong)) {
    out.push({ priority: 58, rec: external('res-factor-contest', 'event', '去因子大赛试试身手', EXTERNAL.factorContest,
      `三项能力都表现不错（${[ev, cal, rc].map((d) => d.name).join('、')}）。因子大赛随到随赛，适合把研究能力放到真实数据上检验。`, [ev, cal, rc], '去看大赛') });
  }
  return out;
}

export function recommend(profile: Profile, input: Pick<AnalyzeInput, 'events' | 'levels'>): Recommendation[] {
  const dims = Object.fromEntries(profile.dimensions.map((d) => [d.id, d])) as Dims;
  const facts = collectLevels(input.events, input.levels);
  const all = candidates(dims, facts).sort((a, b) => b.priority - a.priority);
  const seen = new Set<string>();
  const pick = (type: 'task' | 'other', max: number) => all
    .filter((c) => (type === 'task') === (c.rec.type === 'task'))
    .filter((c) => { const k = c.rec.resource.url ?? c.rec.id; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, max).map((c) => c.rec);
  const tasks = pick('task', R.maxTasks);
  const resources = pick('other', R.maxResources);
  // 至少一条可当场体验的任务：都不满足时给信心小测兜底
  if (tasks.length === 0 && facts.length) {
    tasks.push(task('calibration_quiz', '用信心小测再认识一下自己',
      `各项能力没有明显短板。这个小测用没玩过的真实行情检验你的信心是否靠谱，也能让画像更有把握。`, [dims.calibration], [], facts.map((f) => f.levelId)));
  }
  return [...tasks, ...resources];
}
