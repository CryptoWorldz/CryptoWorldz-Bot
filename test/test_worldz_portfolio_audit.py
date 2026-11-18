#!/usr/bin/env python3
"""No-network domain inventory regressions."""
import json
import tempfile
import unittest
from pathlib import Path
from tools.audit_worldz_portfolio import load_targets

class WorldzPortfolioInventoryTests(unittest.TestCase):
    def test_registry_lists_unretired_domains_without_duplicates(self):
        targets = load_targets()
        names = [item["domain"] for item in targets]
        self.assertGreaterEqual(len(names), 20)
        self.assertEqual(len(names), len(set(names)))
        self.assertIn("purplediamondcrew.com", names)
        self.assertIn("worldz.charity", names)
        self.assertNotIn("oneworldz.com", names)

    def test_reject_duplicate_registration(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "registry.json"
            path.write_text(json.dumps({"schema_version": 1, "domains": [
                {"domain": "worldzhq.com", "ownership": "owned"},
                {"domain": "worldzhq.com", "ownership": "owned"}
            ]}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "duplicate"):
                load_targets(path)

if __name__ == "__main__":
    unittest.main()
