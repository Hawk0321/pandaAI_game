"""Fetch the first two levels' source data. OAuth remains in Codex's credential store."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
QUERIES = {
    "bank": ("get_stock_daily_pre", {"symbol": ["000001.SZ"], "start_date": "20240101", "end_date": "20250630", "fields": ["symbol", "name", "date", "open", "high", "low", "close", "volume", "trade_status"]}),
    "gold": ("get_future_daily", {"symbol": ["AU2504.SHF"], "start_date": "20240601", "end_date": "20250331", "fields": ["symbol", "date", "open", "high", "low", "close", "volume", "open_interest"]}),
    "benchmark": ("get_index_daily", {"symbol": ["000300.SH"], "start_date": "20240101", "end_date": "20250630", "fields": []}),
    "calendar": ("get_trade_cal", {"exchange": "SH", "start_date": "20240101", "end_date": "20250630", "is_trading_day": 1, "fields": []}),
}


def unwrap(payload: dict) -> list[dict]:
    if not payload.get("ok"):
        raise ValueError("Panda Data rejected the query: " + str(payload.get("message") or payload.get("error")))
    if payload.get("trial"):
        raise ValueError("Trial response: " + str(payload["trial"].get("message", payload["trial"])))
    result = payload["result"]
    if isinstance(result, list):
        return result
    if result.get("type") != "dataframe" or result.get("truncated"):
        raise ValueError("Expected a complete dataframe; refuse truncated or unknown response format")
    rows, columns = result["rows"], result["columns"]
    if len(rows) != result.get("total_rows", len(rows)) or any(len(row) != len(columns) for row in rows):
        raise ValueError("Incomplete received table")
    return [dict(zip(columns, row)) for row in rows]


def chunks(start: str, end: str):
    """Use small, non-overlapping three-month queries to stay below preview byte limits."""
    current, last = date.fromisoformat(f"{start[:4]}-{start[4:6]}-{start[6:]}"), date.fromisoformat(f"{end[:4]}-{end[4:6]}-{end[6:]}")
    while current <= last:
        month = current.month - 1 + 3
        following = date(current.year + month // 12, month % 12 + 1, 1)
        stop = min(last, following - timedelta(days=1))
        yield current.strftime("%Y%m%d"), stop.strftime("%Y%m%d")
        current = stop + timedelta(days=1)


def export(name: str, output: Path) -> None:
    method, params = QUERIES[name]
    rows, requests = [], []
    for start, end in chunks(params["start_date"], params["end_date"]):
        query = {**params, "start_date": start, "end_date": end}
        process = subprocess.run(["node", str(ROOT / "mcp_export.mjs"), method, json.dumps(query)], capture_output=True, text=True, encoding="utf-8", timeout=120)
        if process.returncode:
            raise RuntimeError(process.stdout.strip() or "MCP export failed; verify Codex OAuth login")
        payload = json.loads(process.stdout)
        cache = ROOT / ".cache"
        cache.mkdir(exist_ok=True)
        (cache / f"{name}_{start}_{end}.response.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        part = unwrap(payload)
        rows.extend(part)
        requests.append({"start_date": start, "end_date": end, "request_id": payload.get("request_id"), "received_rows": len(part), "transport_sha256": payload["result"].get("sha256") if isinstance(payload["result"], dict) else None})
        print(f"{name} {start}..{end}: {len(part)} rows", flush=True)
    if not rows:
        raise ValueError(f"{name}: no rows received")
    canonical = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    snapshot = {"schema": "pandadata-snapshot/v1", "is_sample": False, "method": method, "params": params, "fetched_at": datetime.now(timezone.utc).isoformat(), "requests": requests, "rows_sha256": hashlib.sha256(canonical).hexdigest(), "received_rows": len(rows), "source_completeness": "unknown", "rows": rows}
    output.mkdir(parents=True, exist_ok=True)
    target = output / f"{name}.json"
    temporary = target.with_suffix(".json.tmp")
    header = json.dumps({key: value for key, value in snapshot.items() if key != "rows"}, ensure_ascii=False, indent=2, allow_nan=False)
    compact_rows = ",\n".join("    " + json.dumps(row, ensure_ascii=False, allow_nan=False) for row in rows)
    temporary.write_text(header[:-2] + ',\n  "rows": [\n' + compact_rows + '\n  ]\n}\n', encoding="utf-8")
    temporary.replace(target)
    print(f"{name}: {len(rows)} real rows -> {target}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=QUERIES)
    parser.add_argument("--output", type=Path, default=ROOT / "source_data")
    args = parser.parse_args()
    for name in ([args.only] if args.only else QUERIES):
        export(name, args.output)


if __name__ == "__main__":
    main()
