"""Validate protocol shape, numerical consistency and recursive play/reveal isolation."""
from __future__ import annotations

import argparse
from datetime import datetime
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
DEFAULT = ROOT.parents[1] / "frontend" / "public" / "levels"
SCENARIOS = {"uptrend", "crash", "range", "fake_breakout", "v_reversal", "gap"}
DIMENSIONS = {"evidence_use", "calibration", "risk_control", "style", "research_depth", "risk_appetite"}
BAR_KEYS = {"t", "o", "h", "l", "c", "v"}
FORBIDDEN = re.compile(r"(^|_)(date|dates|symbol|scenario|outcome|after_bars|future_bars|real_name|fetched_at)(_|$)", re.I)
REAL_VALUE = re.compile(r"\b(?:19|20)\d{2}[-/]\d{2}[-/]\d{2}\b|\b(?:19|20)\d{6}\b|\b(?:\d{6}|AU\d{4}|AG\d{4})\.(?:SH|SZ|SHF)\b", re.I)


def require(condition: bool, message: str) -> None:
    if not condition: raise ValueError(message)


def finite(value) -> bool:
    return not isinstance(value, bool) and isinstance(value, (int, float)) and math.isfinite(value)


def isolation(value, path="play") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            require(not FORBIDDEN.search(key) and key.lower() not in {"name", "source", "api", "bots"}, f"{path}: forbidden identity/future field {key}")
            require(not (key == "t" and finite(child) and child > 0), f"{path}: future t")
            isolation(child, path + "." + key)
    elif isinstance(value, list):
        for item in value: isolation(item, path)
    elif isinstance(value, str):
        require(not REAL_VALUE.search(value), f"{path}: real date or instrument in string")


def bars(values: list, expected: range) -> None:
    require(isinstance(values, list) and len(values) == len(expected), "Wrong number of candles")
    require([row.get("t") for row in values] == list(expected), "Non-contiguous candle t sequence")
    for row in values:
        require(set(row) == BAR_KEYS and all(finite(v) for v in row.values()), "Invalid candle fields/numbers")
        require(type(row["t"]) is int, "Candle t must be integer")
        require(0 < row["l"] <= min(row["o"], row["c"]) <= max(row["o"], row["c"]) <= row["h"] and row["v"] >= 0, "Invalid OHLCV envelope")


def validate_level(play: dict, reveal: dict) -> None:
    isolation(play)
    require(set(play) == {"schema", "id", "is_sample", "market", "timeframe", "masked_name", "bars", "clues", "budget", "hold_steps"}, "Unexpected/missing play fields")
    require(set(reveal) == {"schema", "id", "is_sample", "symbol", "name", "start_date", "decision_date", "end_date", "scenario", "after_bars", "outcome", "key_clue_ids", "bots", "source"}, "Unexpected/missing reveal fields")
    require(play["schema"] == "level-play/v1" and reveal["schema"] == "level-reveal/v1", "Invalid schema")
    require(play["id"] == reveal["id"] and re.fullmatch(r"L\d{2}", play["id"]) is not None, "Mismatched level ID")
    require(type(play["is_sample"]) is bool and play["is_sample"] == reveal["is_sample"], "Sample flags disagree")
    require(play["market"] in {"A股", "指数", "期货"} and play["timeframe"] == "1d", "Invalid market/timeframe")
    require(type(play["budget"]) is int and play["budget"] == 3 and play["hold_steps"] == 3, "Invalid budget/hold steps")
    require(isinstance(play["masked_name"], str) and bool(play["masked_name"]), "Missing masked name")
    serialized = json.dumps(play, ensure_ascii=False)
    require(reveal["symbol"] not in serialized and reveal["name"] not in serialized, "Real identity leaked into play text")
    bars(play["bars"], range(-59, 1)); bars(reveal["after_bars"], range(1, 16))
    require(abs(play["bars"][0]["c"]-100) < 1e-8, "Normalization must use first visible close")
    require(4 <= len(play["clues"]) <= 6, "Expected 4-6 clues")
    ids = []
    for clue in play["clues"]:
        require({"id", "kind", "title", "cost", "text", "signal"} <= set(clue) <= {"id", "kind", "title", "cost", "text", "signal", "series"}, "Invalid clue fields")
        require(all(isinstance(clue[key], str) and clue[key] for key in ["id", "title", "text"]), "Empty clue text/id")
        require(clue["kind"] in {"volume", "ma", "index", "margin", "northbound", "backtest", "news"}, "Invalid clue kind")
        require(type(clue["cost"]) is int and clue["cost"] in {1, 2} and clue["signal"] in {"bullish", "bearish", "neutral"}, "Invalid clue cost/signal")
        require("series" not in clue or (isinstance(clue["series"], list) and 0 < len(clue["series"]) <= 60 and all(finite(v) for v in clue["series"])), "Invalid clue series")
        ids.append(clue["id"])
    require(len(ids) == len(set(ids)), "Duplicate clue IDs")
    require(bool(reveal["key_clue_ids"]) and set(reveal["key_clue_ids"]) <= set(ids), "Unknown/empty key clues")
    require(reveal["scenario"] in SCENARIOS, "Invalid scenario")
    dates = [datetime.strptime(reveal[key], "%Y-%m-%d") for key in ["start_date", "decision_date", "end_date"]]
    require(dates[0] < dates[1] < dates[2], "Invalid reveal dates")
    ret = reveal["after_bars"][-1]["c"]/play["bars"][-1]["c"]-1
    expected = "flat" if abs(ret) < .02 else "up" if ret > 0 else "down"
    require(set(reveal["outcome"]) == {"ret", "direction"} and finite(reveal["outcome"]["ret"]) and abs(ret-reveal["outcome"]["ret"]) < 1e-7 and expected == reveal["outcome"]["direction"], "Inconsistent outcome")
    known, after = play["bars"], reveal["after_bars"]
    price = known[-1]["c"]
    previous_high = max(bar["h"] for bar in known[-21:-1])
    trough = min(bar["c"] for bar in after[:8])
    ma5 = sum(bar["c"] for bar in known[-5:]) / 5
    ma20 = sum(bar["c"] for bar in known[-20:]) / 20
    scenario_valid = {
        "uptrend": ret >= .04 - 1e-8 and ma5 > ma20*1.01 - 1e-8 and price > ma5,
        "crash": ret <= -.10 + 1e-8,
        "range": abs(ret) < .02 + 1e-8 and (max(bar["h"] for bar in after)-min(bar["l"] for bar in after))/price < .08 + 1e-8,
        "fake_breakout": known[-1]["h"] > previous_high and ret < -.025 + 1e-8 and after[-1]["c"] < previous_high*.98 + 1e-8,
        "v_reversal": trough/price <= .96 + 1e-8 and after[-1]["c"]/trough >= 1.07 - 1e-8,
        "gap": abs(after[0]["o"]/price-1) >= .025 - 1e-8,
    }
    require(scenario_valid[reveal["scenario"]], "Scenario label does not match the actual price path")
    require(len(reveal["bots"]) == 3 and {bot["id"] for bot in reveal["bots"]} == {"ma_cross", "turtle", "mean_revert"}, "Missing/duplicate bots")
    for bot in reveal["bots"]:
        require(set(bot) == {"id", "name", "side", "ret"} and bot["side"] in {"long", "short", "flat"} and finite(bot["ret"]), "Invalid bot")
        require(abs(bot["ret"]-ret*{"long": 1, "short": -1, "flat": 0}[bot["side"]]) < 1e-7, "Inconsistent bot return")
    source = reveal["source"]
    require(set(source) == {"api", "adjust", "fields", "fetched_at"}, "Invalid source fields")
    require(source["api"] == ("get_future_daily" if play["market"] == "期货" else "get_stock_daily_pre"), "Incorrect source method")
    require(source["adjust"] == ("none" if play["market"] == "期货" else "pre"), "Incorrect adjustment")
    require(isinstance(source["fields"], list) and {"open", "high", "low", "close", "volume"} <= set(source["fields"]), "Missing source OHLCV fields")
    require(datetime.fromisoformat(source["fetched_at"]).tzinfo is not None, "Fetch timestamp must include timezone")


def validate_index(index: dict, available: set[str]) -> None:
    require(set(index) == {"schema", "is_sample", "main", "pool"} and index["schema"] == "level-index/v1", "Invalid index")
    require(type(index["is_sample"]) is bool and bool(index["main"]) and len(index["main"]) == len(set(index["main"])), "Invalid main IDs/sample flag")
    referenced = set(index["main"])
    pool_ids = []
    for entry in index["pool"]:
        require(set(entry) == {"id", "probes"} and bool(entry["probes"]) and set(entry["probes"]) <= DIMENSIONS, "Invalid supplementary probes")
        pool_ids.append(entry["id"]); referenced.add(entry["id"])
    require(len(pool_ids) == len(set(pool_ids)) and not set(pool_ids) & set(index["main"]), "Duplicate/reused main and pool IDs")
    require(referenced == available, "Index has missing files or unreferenced public levels")


def validate_release(index: dict, levels: dict[str, tuple[dict, dict]]) -> None:
    require(len(index["main"]) == 4 and len(index["pool"]) == 6 and len(levels) == 10, "Full release requires 4 main levels and 6 supplementary levels (10 total)")
    require(len({levels[level_id][1]["scenario"] for level_id in index["main"]}) == 4, "Main levels must cover 4 distinct scenarios")
    require({reveal["scenario"] for _, reveal in levels.values()} == SCENARIOS, "Full release requires all 6 scenarios")
    identities = {(reveal["symbol"], reveal["decision_date"]) for _, reveal in levels.values()}
    require(len(identities) == 10, "Repeated instrument/decision-date case")
    probes = [probe for entry in index["pool"] for probe in entry["probes"]]
    for ability in ["evidence_use", "calibration", "risk_control"]:
        require(probes.count(ability) >= 2, f"Need two supplementary levels probing {ability}")
        dates = sorted(datetime.strptime(levels[entry["id"]][1]["decision_date"], "%Y-%m-%d") for entry in index["pool"] if ability in entry["probes"])
        require(all((right-left).days >= 30 for left, right in zip(dates, dates[1:])), "Same-ability probes must not reuse a single short market episode")
    for entry in index["pool"]:
        play, reveal = levels[entry["id"]]
        price, after = play["bars"][-1]["c"], reveal["after_bars"]
        signals = [clue["signal"] for clue in play["clues"]]
        for probe in entry["probes"]:
            if probe == "evidence_use":
                require({"bullish", "bearish"} <= set(signals), "Evidence-use level needs conflicting visible signals")
            elif probe == "calibration":
                require(signals.count("neutral") >= 3, "Calibration level needs visibly uncertain evidence")
                require(reveal["outcome"]["direction"] != "flat" and abs(after[-1]["c"]/price-1) >= .02-1e-8, "Calibration level needs a directional outcome to score confidence")
            elif probe == "risk_control":
                require(min(bar["l"] for bar in after[:5])/price <= .96 + 1e-8, "Risk-control level needs a first-step drawdown of at least 4%")
                require(after[-1]["c"]/min(bar["c"] for bar in after[:8]) >= 1.07 - 1e-8, "Risk-control level needs a rebound of at least 7% from the early trough")


def check(directory: Path = DEFAULT, complete: bool = False) -> list[tuple[dict, dict]]:
    index = json.loads((directory / "index.json").read_text(encoding="utf-8"))
    plays = {p.name.removesuffix(".play.json"): p for p in directory.glob("*.play.json")}
    reveals = {p.name.removesuffix(".reveal.json"): p for p in directory.glob("*.reveal.json")}
    require(set(plays) == set(reveals), "Unpaired play/reveal files")
    validate_index(index, set(plays))
    levels = []
    for level_id in sorted(plays):
        play, reveal = [json.loads(p.read_text(encoding="utf-8")) for p in [plays[level_id], reveals[level_id]]]
        require(play["id"] == level_id and index["is_sample"] == play["is_sample"], "File/index flags or IDs disagree")
        validate_level(play, reveal); levels.append((play, reveal))
    if complete:
        validate_release(index, {play["id"]: (play, reveal) for play, reveal in levels})
    return levels


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=DEFAULT)
    parser.add_argument("--require-complete", action="store_true")
    args = parser.parse_args()
    levels = check(args.directory, args.require_complete)
    print(f"PASS: {len(levels)} levels; each 60 visible + 15 future candles; protocol, isolation and arithmetic valid")
