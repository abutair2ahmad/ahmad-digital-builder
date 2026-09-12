#!/usr/bin/env python3
"""`bin/igpost due --brand B` must scope the due-slot loop to one brand and leave
the other brand's lane untouched. With no --brand it must keep the original
behavior of processing every configured brand.

`bin/igpost` has no .py extension, so it is loaded via importlib rather than a
normal package import.

Run: python3 tests/test_due_brand_filter.py
"""

import argparse
import importlib.util
import io
import os
import sys
import unittest
from contextlib import redirect_stderr
from importlib.machinery import SourceFileLoader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "src"))


def load_cli():
    path = os.path.join(ROOT, "bin", "igpost")
    loader = SourceFileLoader("igpost_cli", path)
    spec = importlib.util.spec_from_loader("igpost_cli", loader, origin=path)
    module = importlib.util.module_from_spec(spec)
    loader.exec_module(module)
    return module


CLI = load_cli()

FAKE_SCHEDULE = {"timezone": "Asia/Jerusalem", "slots": ["10:00"], "catch_up_minutes": 90}
FAKE_DUE = [{"date": "2026-01-01", "slot": "10:00", "due_at": "2026-01-01T10:00:00+02:00",
             "late_seconds": 60}]


class DueBrandFilter(unittest.TestCase):
    def setUp(self):
        self.calls = []
        self._real_schedule = CLI._schedule
        self._real_due_slots = CLI.clock.due_slots
        self._real_run_slot = CLI.runner.run_slot
        CLI._schedule = lambda: FAKE_SCHEDULE
        CLI.clock.due_slots = lambda now, schedule: FAKE_DUE

        def fake_run_slot(root, brand, date_str, slot, env_path=None, dry_run=None, verbose=True):
            self.calls.append(brand)
            return {"key": "%s:%s:%s" % (brand, date_str, slot), "action": "dry_run", "published": False}

        CLI.runner.run_slot = fake_run_slot

    def tearDown(self):
        CLI._schedule = self._real_schedule
        CLI.clock.due_slots = self._real_due_slots
        CLI.runner.run_slot = self._real_run_slot

    def _run(self, brand):
        args = argparse.Namespace(env=CLI.DEFAULT_ENV, live=False, brand=brand)
        CLI.cmd_due(args)

    def test_no_brand_processes_every_configured_brand(self):
        self._run(brand=None)
        self.assertEqual(sorted(self.calls), sorted(CLI.BRANDS))

    def test_brand_movewell_processes_movewell_only(self):
        self._run(brand="movewell")
        self.assertEqual(self.calls, ["movewell"])
        self.assertNotIn("bynexora", self.calls)

    def test_brand_bynexora_processes_bynexora_only(self):
        self._run(brand="bynexora")
        self.assertEqual(self.calls, ["bynexora"])
        self.assertNotIn("movewell", self.calls)

    def test_invalid_brand_is_rejected_by_argparse_before_anything_runs(self):
        buf = io.StringIO()
        real_argv = sys.argv
        sys.argv = ["igpost", "due", "--brand", "not-a-real-brand"]
        try:
            with self.assertRaises(SystemExit) as ctx:
                with redirect_stderr(buf):
                    CLI.main()
        finally:
            sys.argv = real_argv
        self.assertEqual(ctx.exception.code, 2)
        self.assertIn("invalid choice", buf.getvalue())
        self.assertEqual(self.calls, [])   # argparse exited before cmd_due ever ran


if __name__ == "__main__":
    unittest.main()
