"""Behavioral tests for information boundaries and real source data."""
from copy import deepcopy
from collections import Counter
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
        with tempfile.TemporaryDirectory() as directory:
            cls.reports = build.build(output=Path(directory))
            cls.index = json.loads(Path(directory, "index.json").read_text(encoding="utf-8"))
            cls.levels = {play["id"]: (play, reveal) for play, reveal in check.check(Path(directory), complete=True)}
        cls.plans = []
        for plan, report in zip(build.LEVEL_PLANS, cls.reports):
            snapshot = build.read_snapshot(build.SOURCE, plan["dataset"])
            rows = build.market_rows(snapshot)
            cls.plans.append((plan["id"], snapshot, rows, report["decision_index"], report["scenario"], plan["market"], plan["name"]))

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

    def test_checker_rejects_scenario_labels_that_do_not_match_prices(self):
        play, reveal = self.generate(self.plans[0])
        bad = deepcopy(reveal); bad["scenario"] = "range"
        with self.assertRaisesRegex(ValueError, "Scenario label"): check.validate_level(play, bad)

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
            self.assertEqual(len(check.check(output, complete=True)), 10)

    def test_ten_level_release_covers_assets_scenarios_and_probes(self):
        self.assertEqual(len(self.levels), 10)
        self.assertEqual(len(self.index["main"]), 4)
        self.assertEqual(len(self.index["pool"]), 6)
        self.assertEqual(len({self.levels[key][1]["scenario"] for key in self.index["main"]}), 4)
        self.assertEqual({reveal["scenario"] for _, reveal in self.levels.values()}, check.SCENARIOS)
        self.assertEqual(len({reveal["symbol"] for _, reveal in self.levels.values()}), 8)
        self.assertEqual(Counter(probe for entry in self.index["pool"] for probe in entry["probes"]), Counter(evidence_use=2, calibration=2, risk_control=2))
        for left in self.reports:
            for right in self.reports:
                if left["id"] >= right["id"]: continue
                if left["dataset"] == right["dataset"]:
                    self.assertGreaterEqual(abs(left["decision_index"]-right["decision_index"]), 60)
                if set(left["probes"]) & set(right["probes"]):
                    self.assertGreaterEqual(abs(self.calendar.index(left["decision_date"].replace('-', ''))-self.calendar.index(right["decision_date"].replace('-', ''))), 30)

    def test_release_rejects_wrong_supplementary_probe_evidence(self):
        for level_id, expected in [("L07", "conflicting"), ("L06", "uncertain")]:
            bad = deepcopy(self.levels)
            for clue in bad[level_id][0]["clues"]: clue["signal"] = "bullish"
            with self.subTest(level=level_id), self.assertRaisesRegex(ValueError, expected): check.validate_release(self.index, bad)
        bad = deepcopy(self.levels)
        price = bad["L05"][0]["bars"][-1]["c"]
        for bar in bad["L05"][1]["after_bars"][:5]:
            for key in ["o", "h", "l", "c"]: bar[key] = price
        with self.assertRaisesRegex(ValueError, "first-step drawdown"): check.validate_release(self.index, bad)

    def test_two_level_delivery_is_not_a_complete_release(self):
        index = {"schema": "level-index/v1", "is_sample": False, "main": ["L01", "L02"], "pool": []}
        with self.assertRaisesRegex(ValueError, "10 total"): check.validate_release(index, {key: self.levels[key] for key in index["main"]})

    def test_calibration_supplements_reject_unscorable_flat_outcomes(self):
        for level_id in ["L06", "L08"]:
            bad = deepcopy(self.levels)
            bad[level_id][1]["outcome"]["direction"] = "flat"
            with self.subTest(level=level_id), self.assertRaisesRegex(ValueError, "directional outcome"):
                check.validate_release(self.index, bad)

    def test_all_candidate_sources_are_real_and_match_the_export_manifest(self):
        total = 0
        for dataset, (method, params) in fetch.QUERIES.items():
            snapshot = build.read_snapshot(build.SOURCE, dataset)
            self.assertEqual(snapshot["method"], method)
            self.assertEqual(snapshot["params"], params)
            self.assertFalse(snapshot["is_sample"])
            self.assertGreater(snapshot["received_rows"], 75)
            if dataset != "calendar": build.market_rows(snapshot)
            total += snapshot["received_rows"]
        self.assertEqual(total, 3234)


if __name__ == "__main__":
    unittest.main()
