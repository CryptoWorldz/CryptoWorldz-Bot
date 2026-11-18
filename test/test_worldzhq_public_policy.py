#!/usr/bin/env python3
"""Fail if HQ public pages reintroduce superseded Worldz policy/brand copy."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class WorldzHQPublicPolicyTests(unittest.TestCase):
    def test_current_public_copy(self):
        paths = ("worldzhq.com/index.html", "worldzhq.com/treasury/index.html")
        for path in paths:
            body = (ROOT / path).read_text(encoding="utf-8").lower()
            for term in ("dipshit", "multisig", "founding 20", "3-of-5", "4-of-7"):
                self.assertNotIn(term, body, f"{path} contains retired copy {term}")

    def test_worldzhq_routes_to_sparky(self):
        homepage = (ROOT / "worldzhq.com/index.html").read_text(encoding="utf-8")
        self.assertIn("t.me/SparkyWorldzBot", homepage)

    def test_treasury_policy_and_safety(self):
        page = (ROOT / "worldzhq.com/treasury/index.html").read_text(encoding="utf-8")
        for term in ("developer-controlled wallets", "Founding 100", "verification", "No humanitarian support requires purchasing a token"):
            self.assertIn(term, page)

if __name__ == "__main__":
    unittest.main()
