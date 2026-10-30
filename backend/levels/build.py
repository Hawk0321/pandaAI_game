"""Build ten real-data levels from reproducible, credential-free snapshots."""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
from statistics import mean, pstdev

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
OUTPUT = REPO / "frontend" / "public" / "levels"
SOURCE = ROOT / "source_data"
SCENARIOS = {"uptrend", "crash", "range", "fake_breakout", "v_reversal", "gap"}
LEVEL_PLANS = [
    {"id": "L01", "dataset": "bank", "market": "A股", "name": "平安银行", "scenario": "fake_breakout", "probe": None},
    {"id": "L02", "dataset": "gold", "market": "期货", "name": "沪金2504", "scenario": "uptrend", "probe": None},
    {"id": "L03", "dataset": "catl", "market": "A股", "name": "宁德时代", "scenario": "crash", "probe": None},
    {"id": "L04", "dataset": "shenhua", "market": "A股", "name": "中国神华", "scenario": "range", "probe": None},
    {"id": "L05", "dataset": "maotai", "market": "A股", "name": "贵州茅台", "scenario": "v_reversal", "probe": "risk_control"},
    {"id": "L06", "dataset": "eastmoney", "market": "A股", "name": "东方财富", "scenario": "gap", "probe": "calibration"},
    {"id": "L07", "dataset": "zijin", "market": "A股", "name": "紫金矿业", "scenario": "fake_breakout", "probe": "evidence_use"},
    {"id": "L08", "dataset": "silver", "market": "期货", "name": "沪银2502", "scenario": "range", "probe": "calibration"},
    {"id": "L09", "dataset": "zijin", "market": "A股", "name": "紫金矿业", "scenario": "v_reversal", "probe": "risk_control"},
    {"id": "L10", "dataset": "catl", "market": "A股", "name": "宁德时代", "scenario": "fake_breakout", "probe": "evidence_use"},
]


def read_snapshot(directory: Path, name: str) -> dict:
    snapshot = json.loads((directory / f"{name}.json").read_text(encoding="utf-8"))
    if snapshot.get("schema") != "pandadata-snapshot/v1" or snapshot.get("is_sample") is not False:
        raise ValueError(f"{name}: expected a real, audited snapshot")
    rows = snapshot["rows"]
    encoded = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    if hashlib.sha256(encoded).hexdigest() != snapshot["rows_sha256"] or len(rows) != snapshot["received_rows"]:
        raise ValueError(f"{name}: snapshot integrity check failed")
    return snapshot


def date_key(value) -> str:
    key = str(value).replace("-", "")
    datetime.strptime(key, "%Y%m%d")
    return key


def market_rows(snapshot: dict) -> list[dict]:
    rows = sorted(snapshot["rows"], key=lambda row: date_key(row["date"]))
    seen = set()
    expected = set(snapshot["params"]["symbol"])
    for row in rows:
        day = date_key(row["date"])
        if day in seen or row["symbol"] not in expected:
            raise ValueError("Duplicate date or unexpected instrument")
        if not snapshot["params"]["start_date"] <= day <= snapshot["params"]["end_date"]:
            raise ValueError("Received a row outside the requested date range")
        seen.add(day)
        for field in ["open", "high", "low", "close", "volume"]:
            value = row[field]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f"Invalid {field} on {day}")
        if not (0 < row["low"] <= min(row["open"], row["close"]) <= max(row["open"], row["close"]) <= row["high"]) or row["volume"] < 0:
            raise ValueError(f"Invalid OHLCV on {day}")
    return rows


def candle(row: dict, t: int, base: float) -> dict:
    # Keep volume in provider units. Only the first *visible* close sets the price scale.
    return {"t": t, **{short: round(row[long] / base * 100, 8) for short, long in [("o", "open"), ("h", "high"), ("l", "low"), ("c", "close")]}, "v": row["volume"]}


def sign_signal(value: float, threshold: float) -> str:
    return "bullish" if value > threshold else "bearish" if value < -threshold else "neutral"


def features(known: list[dict]) -> dict:
    closes = [row["close"] for row in known]
    previous = known[-21:-1]
    return {"ma5": mean(closes[-5:]), "ma20": mean(closes[-20:]), "std20": pstdev(closes[-20:]),
            "volume_ratio": mean(row["volume"] for row in known[-3:]) / mean(row["volume"] for row in known[-23:-3]),
            "return5": closes[-1] / closes[-6] - 1,
            "atr": mean(max(known[i]["high"] - known[i]["low"], abs(known[i]["high"] - known[i-1]["close"]), abs(known[i]["low"] - known[i-1]["close"])) for i in range(len(known)-14, len(known))),
            "high20": max(row["high"] for row in previous), "low20": min(row["low"] for row in previous)}


def make_clues(known: list[dict], benchmark: list[dict], market: str) -> tuple[list[dict], list[str]]:
    """This function accepts no future data, real labels, or selection outcomes."""
    f, price = features(known), known[-1]["close"]
    base = known[0]["close"]
    ma_signal = sign_signal(f["ma5"] / f["ma20"] - 1, .01)
    volume_signal = "neutral"
    if f["volume_ratio"] >= 1.2:
        volume_signal = sign_signal(f["return5"], .01)
    elif f["volume_ratio"] < .8 and f["return5"] > .01:
        volume_signal = "bearish"
    closes = [row["close"] for row in known]
    hits = []
    for i in range(20, len(known)-1):
        historical = 1 if mean(closes[i-4:i+1]) > mean(closes[i-19:i+1]) else -1
        hits.append(historical * (closes[i+1] / closes[i] - 1) > 0)
    rate = sum(hits) / len(hits)
    benchmark_return = benchmark[-1]["close"] / benchmark[-6]["close"] - 1
    index_signal = sign_signal(benchmark_return, .015) if market == "A股" else "neutral"
    index_text = f"同期股票大盘近 5 个交易日变动 {benchmark_return:+.2%}。"
    if market == "期货":
        index_text += "这是跨市场背景，不能直接作为本品种的买卖方向信号。"
    breakout_signal = "bullish" if price > f["high20"] else "bearish" if price < f["low20"] or (known[-1]["high"] > f["high20"] and price <= f["high20"]) else "neutral"
    clues = [
        {"id": "vol", "kind": "volume", "title": "成交量", "cost": 1, "text": f"最近 3 日均量是此前 20 日均量的 {f['volume_ratio']:.2f} 倍；近 5 日价格变动 {f['return5']:+.2%}。量价信号不保证后续走势。", "signal": volume_signal, "series": [row["volume"] for row in known[-20:]]},
        {"id": "ma", "kind": "ma", "title": "均线方向", "cost": 1, "text": f"归一化 MA5={f['ma5']/base*100:.2f}，MA20={f['ma20']/base*100:.2f}，短均线相对长均线 {f['ma5']/f['ma20']-1:+.2%}。", "signal": ma_signal,
         "series": [round(mean(closes[i-4:i+1])/base*100, 6) for i in range(40, 60)]},
        {"id": "index", "kind": "index", "title": "大盘环境", "cost": 1, "text": index_text, "signal": index_signal, "series": [round(row["close"]/benchmark[0]["close"]*100, 6) for row in benchmark[-20:]]},
        {"id": "backtest", "kind": "backtest", "title": "历史信号核验", "cost": 2, "text": f"只用已揭晓历史，5/20 均线方向在 {len(hits)} 次下一日检验中命中 {sum(hits)} 次（{rate:.0%}）。不含本次决定之后的数据；样本少，未计费用。", "signal": ma_signal if rate >= .55 else "neutral"},
        {"id": "risk", "kind": "ma", "title": "历史波动", "cost": 1, "text": f"ATR14 约为现价的 {f['atr']/price:.2%}；固定 5% 止损约相当于 {price*.05/f['atr']:.1f} 倍历史日波动。仓位和保护线需结合波动考虑。", "signal": "neutral"},
        {"id": "breakout", "kind": "ma", "title": "突破确认", "cost": 1, "text": f"此前 20 根最高价为 {f['high20']/base*100:.2f}，最低价为 {f['low20']/base*100:.2f}（归一化）。本根最高价相对前高 {known[-1]['high']/f['high20']-1:+.2%}，收盘相对前高 {price/f['high20']-1:+.2%}；盘中创新高不等于收盘确认突破。", "signal": breakout_signal},
    ]
    keys = ["ma", "backtest"]
    if known[-1]["high"] > f["high20"] and price <= f["high20"]:
        keys = ["breakout", "backtest"]
    elif volume_signal == "bearish" and f["return5"] > .01:
        keys = ["vol", "ma"]
    elif market == "A股" and {ma_signal, index_signal} == {"bullish", "bearish"}:
        keys = ["ma", "index"]
    elif f["atr"] / price > .025:
        keys = ["risk", "ma"]
    return clues, keys


def bot_sides(known: list[dict]) -> list[dict]:
    f, price = features(known), known[-1]["close"]
    return [
        {"id": "ma_cross", "name": "双均线", "side": "long" if f["ma5"] > f["ma20"] else "short" if f["ma5"] < f["ma20"] else "flat"},
        {"id": "turtle", "name": "海龟突破", "side": "long" if price > f["high20"] else "short" if price < f["low20"] else "flat"},
        {"id": "mean_revert", "name": "均值回归", "side": "short" if price > f["ma20"] + 2*f["std20"] else "long" if price < f["ma20"] - 2*f["std20"] else "flat"},
    ]


def classify(known: list[dict], after: list[dict]) -> set[str]:
    """Author-only curation labels; never used to calculate clues or bot directions."""
    price, f = known[-1]["close"], features(known)
    ret = after[-1]["close"] / price - 1
    labels = set()
    if ret >= .04 and f["ma5"] > f["ma20"]*1.01 and price > f["ma5"]: labels.add("uptrend")
    if ret <= -.10: labels.add("crash")
    if abs(ret) < .02 and (max(r["high"] for r in after)-min(r["low"] for r in after))/price < .08: labels.add("range")
    if known[-1]["high"] > f["high20"] and ret < -.025 and after[-1]["close"] < f["high20"]*.98: labels.add("fake_breakout")
    trough = min(row["close"] for row in after[:8])
    if trough/price-1 <= -.04 and after[-1]["close"]/trough-1 >= .07: labels.add("v_reversal")
    if abs(after[0]["open"]/price-1) >= .025: labels.add("gap")
    return labels


def probe_eligible(known: list[dict], after: list[dict], clues: list[dict], probe: str | None) -> bool:
    if probe is None:
        return True
    if probe == "evidence_use":
        return {"bullish", "bearish"} <= {clue["signal"] for clue in clues}
    if probe == "calibration":
        return sum(clue["signal"] == "neutral" for clue in clues) >= 3
    if probe == "risk_control":
        return min(row["low"] for row in after[:5]) / known[-1]["close"] <= .96 and after[-1]["close"] / min(row["close"] for row in after[:8]) >= 1.07
    raise ValueError(f"Unsupported ability probe: {probe}")


def select(rows: list[dict], benchmark: dict[str, dict], calendar: list[str], preferences: list[str], *, probe: str | None = None, market: str = "A股", used_decisions: tuple[int, ...] = (), used_probe_dates: tuple[str, ...] = ()) -> tuple[int, str, dict]:
    candidates, counts = [], Counter()
    calendar_position = {day: i for i, day in enumerate(calendar)}
    for i in range(59, len(rows)-15):
        if any(abs(i - previous) < 60 for previous in used_decisions): continue
        window = rows[i-59:i+16]
        dates = [date_key(row["date"]) for row in window]
        if any(row["volume"] <= 0 or row.get("trade_status", 0) != 0 for row in window): continue
        if any(day not in benchmark or day not in calendar_position for day in dates): continue
        if any(abs(calendar_position[dates[59]] - calendar_position[previous]) < 30 for previous in used_probe_dates): continue
        positions = [calendar_position[day] for day in dates]
        if positions != list(range(positions[0], positions[0]+75)): continue
        known, after = window[:60], window[60:]
        labels = classify(known, after)
        if probe is not None:
            aligned = [benchmark[day] for day in dates[:60]]
            clues, _ = make_clues(known, aligned, market)
            if not probe_eligible(known, after, clues, probe): continue
        counts.update(labels)
        for scenario in labels:
            if scenario in preferences:
                f = features(known)
                # Prefer readable, liquid examples; scenario thresholds are fixed above.
                score = min(mean(r["volume"] for r in window), 1e8)/1e8 + (1 if f["volume_ratio"] < .8 and f["return5"] > .01 else 0)
                candidates.append((preferences.index(scenario), -score, date_key(rows[i]["date"]), i, scenario))
    if not candidates: raise ValueError("No complete, liquid 60+15 window satisfies the documented scenarios")
    _, _, _, index, scenario = min(candidates)
    return index, scenario, dict(counts)


def make_level(level_id: str, snapshot: dict, rows: list[dict], decision: int, scenario: str, benchmark: dict[str, dict], market: str, name: str) -> tuple[dict, dict]:
    known, after = rows[decision-59:decision+1], rows[decision+1:decision+16]
    aligned = [benchmark[date_key(row["date"])] for row in known]
    clues, keys = make_clues(known, aligned, market)
    base = known[0]["close"]
    ret = after[-1]["close"]/known[-1]["close"]-1
    bots = [{**bot, "ret": round(ret * {"long": 1, "short": -1, "flat": 0}[bot["side"]], 10)} for bot in bot_sides(known)]
    play = {"schema": "level-play/v1", "id": level_id, "is_sample": False, "market": market, "timeframe": "1d", "masked_name": "匿名行情 · " + level_id, "bars": [candle(row, i-59, base) for i, row in enumerate(known)], "clues": clues, "budget": 3, "hold_steps": 3}
    iso = lambda row: datetime.strptime(date_key(row["date"]), "%Y%m%d").date().isoformat()
    reveal = {"schema": "level-reveal/v1", "id": level_id, "is_sample": False, "symbol": known[-1]["symbol"], "name": name, "start_date": iso(known[0]), "decision_date": iso(known[-1]), "end_date": iso(after[-1]), "scenario": scenario, "after_bars": [candle(row, i+1, base) for i, row in enumerate(after)], "outcome": {"ret": round(ret, 10), "direction": "flat" if abs(ret) < .02 else "up" if ret > 0 else "down"}, "key_clue_ids": keys, "bots": bots, "source": {"api": snapshot["method"], "adjust": "pre" if market == "A股" else "none", "fields": snapshot["params"]["fields"], "fetched_at": snapshot["fetched_at"]}}
    return play, reveal


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def build(source: Path = SOURCE, output: Path = OUTPUT) -> list[dict]:
    benchmark = {date_key(row["date"]): row for row in market_rows(read_snapshot(source, "benchmark"))}
    calendar_rows = read_snapshot(source, "calendar")["rows"]
    calendar = sorted(date_key(row["nature_date"]) for row in calendar_rows if row["is_trade"] == 1)
    if len(calendar) != len(set(calendar)): raise ValueError("Duplicate trading-calendar date")
    reports = []
    generated = []
    used: dict[str, list[int]] = {}
    probe_dates: dict[str, list[str]] = {}
    for plan in LEVEL_PLANS:
        level_id, dataset, market, name = [plan[key] for key in ["id", "dataset", "market", "name"]]
        snapshot = read_snapshot(source, dataset)
        rows = market_rows(snapshot)
        decision, scenario, counts = select(rows, benchmark, calendar, [plan["scenario"]], probe=plan["probe"], market=market, used_decisions=tuple(used.get(dataset, [])), used_probe_dates=tuple(probe_dates.get(plan["probe"], [])))
        used.setdefault(dataset, []).append(decision)
        if plan["probe"]:
            probe_dates.setdefault(plan["probe"], []).append(date_key(rows[decision]["date"]))
        play, reveal = make_level(level_id, snapshot, rows, decision, scenario, benchmark, market, name)
        generated.append((level_id, play, reveal))
        known, after = rows[decision-59:decision+1], rows[decision+1:decision+16]
        reports.append({"id": level_id, "role": "pool" if plan["probe"] else "main", "probes": [plan["probe"]] if plan["probe"] else [], "dataset": dataset, "decision_index": decision, "symbol": reveal["symbol"], "start_date": reveal["start_date"], "decision_date": reveal["decision_date"], "end_date": reveal["end_date"], "scenario": scenario, "outcome": reveal["outcome"], "candidate_counts": counts,
                        "probe_evidence": {"signals": {clue["id"]: clue["signal"] for clue in play["clues"]}, "first_step_min_return": min(row["low"] for row in after[:5])/known[-1]["close"]-1, "rebound_from_first8_close_trough": after[-1]["close"]/min(row["close"] for row in after[:8])-1}})
    # Validate everything before replacing any public file.
    from check import validate_level, validate_index, validate_release
    for _, play, reveal in generated: validate_level(play, reveal)
    index = {"schema": "level-index/v1", "is_sample": False, "main": [plan["id"] for plan in LEVEL_PLANS if not plan["probe"]], "pool": [{"id": plan["id"], "probes": [plan["probe"]]} for plan in LEVEL_PLANS if plan["probe"]]}
    validate_index(index, {item[0] for item in generated})
    validate_release(index, {level_id: (play, reveal) for level_id, play, reveal in generated})
    for level_id, play, reveal in generated:
        write_json(output / f"{level_id}.play.json", play)
        write_json(output / f"{level_id}.reveal.json", reveal)
    write_json(output / "index.json", index)
    if output.resolve() == OUTPUT.resolve():
        write_json(ROOT / "selection_report.json", reports)
    return reports


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    for report in build(args.source, args.output):
        print(f"{report['id']}: {report['symbol']} {report['decision_date']} {report['scenario']} -> {report['outcome']['ret']:+.2%}")
