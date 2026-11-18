#!/usr/bin/env python3
"""Offline regression tests for PDC NextGen health acceptance/rejection."""
import unittest
from tools.check_worldz_public_health import validate_nextgen_html, PDC_MARKERS

class PDCNextGenHealthTests(unittest.TestCase):
    def test_accepts_expected_nextgen_shape(self):
        html = "<html><body>" + "\n".join(PDC_MARKERS) + "</body></html>"
        validate_nextgen_html(html)

    def test_rejects_old_static_pdc_homepage(self):
        old = "<html><h2>What Purple Diamond Crew does — and aims to build</h2></html>"
        with self.assertRaisesRegex(RuntimeError, "LIVE_NEXTGEN_MARKER_MISSING"):
            validate_nextgen_html(old)

    def test_rejects_missing_hope_chest_route(self):
        html = "\n".join(marker for marker in PDC_MARKERS if marker != "/chest/")
        with self.assertRaisesRegex(RuntimeError, "/chest/"):
            validate_nextgen_html(html)

if __name__ == "__main__":
    unittest.main()
