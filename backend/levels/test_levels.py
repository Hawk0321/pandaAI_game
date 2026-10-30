"""Behavioral tests for information boundaries and real source data."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

import build
import check
import fetch


class LevelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.benchmark = {build.date_key(r["date"]): r for r in build.market_rows(build.read_snapshot(build.SOURCE, "benchmark"))}
        cls.calendar = sorted(build.date_key(r["nature_date"]) for r in build.read_snapshot(build.SOURCE, "calendar")["rows"])
        cls.plans = []
        for level_id, dataset, market, name, prefs in [("L01", "bank", "A股", "平安银行", ["fake_breakout"]), ("L02", "gold", "期货", "沪金2504", ["uptrend"])]:
            snapshot = build.read_snapshot(build.SOURCE, dataset)
            rows = build.market_rows(snapshot)
            i, scenario, _ = build.select(rows, cls.benchmark, cls.calendar, prefs)
            cls.plans.append((level_id, snapshot, rows, i, scenario, market, name))

    def generate(self, plan, rows=None, benchmark=None):
        level_id, snapshot, original, i, scenario, market, name = plan
        return build.make_level(level_id, snapshot, rows or original, i, scenario, benchmark or self.benchmark, market, name)

    def test_future_prices_and_volume_cannot_change_play_clues_keys_or_bot_sides(self):
        for plan in self.plans:
            with self.subTest(level=plan[0]):
                before, reveal = self.generate(plan)
                mutated = deepcopy(plan[2])
                for row in mutated[plan[3]+1:]:
                    for key in ["open", "high", "low", "close"]: row[key] *= 1.7
                    row["volume"] *= 9
                after, changed = self.generate(plan, rows=mutated)
                self.assertEqual(before, after)
                self.assertEqual(reveal["key_clue_ids"], changed["key_clue_ids"])
                self.assertEqual([b["side"] for b in reveal["bots"]], [b["side"] for b in changed["bots"]])
                self.assertNotEqual(reveal["outcome"], changed["outcome"])

    def test_future_benchmark_cannot_change_play(self):
        for plan in self.plans:
            changed = deepcopy(self.benchmark)
            decision = build.date_key(plan[2][plan[3]]["date"])
            for day, row in changed.items():
                if day > decision: row["close"] *= 3
            self.assertEqual(self.generate(plan)[0], self.generate(plan, benchmark=changed)[0])

    def test_checker_rejects_nested_identity_and_future_candles(self):
        play, reveal = self.generate(self.plans[0])
        for field, value in [("after_bars", [{"t": 1}]), ("symbol", "000001.SZ"), ("date", "20240520")]:
            bad = deepcopy(play); bad["clues"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): check.validate_level(bad, reveal)
        bad = deepcopy(play); bad["bars"][-1]["t"] = 1
        with self.assertRaises(ValueError): check.validate_level(bad, reveal)

    def test_checker_rejects_identity_in_human_readable_text(self):
        play, reveal = self.generate(self.plans[0])
        for text in ["标的是平安银行", "决定日期 2024-05-20", "20240520", "000001.SZ"]:
            bad = deepcopy(play); bad["clues"][0]["text"] = text
            with self.subTest(text=text), self.assertRaises(ValueError): check.validate_level(bad, reveal)

    def test_checker_rejects_bad_ohlc_and_wrong_return(self):
        play, reveal = self.generate(self.plans[0])
        bad = deepcopy(play); bad["bars"][0]["h"] = .01
        with self.assertRaises(ValueError): check.validate_level(bad, reveal)
        bad = deepcopy(reveal); bad["outcome"]["ret"] = .5
        with self.assertRaises(ValueError): check.validate_level(play, bad)
        bad = deepcopy(reveal); bad["bots"][0]["ret"] = .5
        with self.assertRaises(ValueError): check.validate_level(play, bad)

    def test_missing_trading_day_cannot_be_silently_compressed(self):
        plan = self.plans[0]
        window = plan[2][plan[3]-59:plan[3]+16]
        missing = build.date_key(window[10]["date"])
        calendar = [day for day in self.calendar if day != missing]
        with self.assertRaises(ValueError): build.select(window, self.benchmark, calendar, ["fake_breakout"])

    def test_source_rejects_duplicate_dates_and_non_finite_prices(self):
        snapshot = deepcopy(self.plans[0][1])
        snapshot["rows"].append(snapshot["rows"][0])
        with self.assertRaises(ValueError): build.market_rows(snapshot)
        snapshot = deepcopy(self.plans[0][1]); snapshot["rows"][0]["close"] = float("nan")
        with self.assertRaises(ValueError): build.market_rows(snapshot)

    def test_source_hash_detects_edits(self):
        with tempfile.TemporaryDirectory() as directory:
            snapshot = deepcopy(self.plans[0][1]); snapshot["rows"][0]["close"] += .1
            Path(directory, "bank.json").write_text(json.dumps(snapshot), encoding="utf-8")
            with self.assertRaises(ValueError): build.read_snapshot(Path(directory), "bank")

    def test_export_refuses_truncated_preview(self):
        with self.assertRaises(ValueError): fetch.unwrap({"ok": True, "result": {"type": "dataframe", "truncated": True}})

    def test_query_chunks_have_no_overlap_or_missing_boundary_days(self):
        self.assertEqual(list(fetch.chunks("20240101", "20240630")), [("20240101", "20240331"), ("20240401", "20240630")])
        self.assertEqual(list(fetch.chunks("20240229", "20240301")), [("20240229", "20240301")])

    def test_rebuild_is_deterministic_and_valid(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build.build(output=output)
            first = {p.name: p.read_bytes() for p in output.glob("*.json")}
            build.build(output=output)
            self.assertEqual(first, {p.name: p.read_bytes() for p in output.glob("*.json")})
            self.assertEqual(len(check.check(output)), 2)
            with self.assertRaises(ValueError): check.check(output, complete=True)


if __name__ == "__main__":
    unittest.main()
