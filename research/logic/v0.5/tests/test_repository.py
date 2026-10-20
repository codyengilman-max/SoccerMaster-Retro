import copy
import importlib.util
from pathlib import Path
import re
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("validator", ROOT / "tools/validate_repository.py")
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.catalog = v.read_json(ROOT / "data/scenario_catalog.json")
        self.sources = {f"S{i}" for i in range(1, 19)}
        self.original = {}
        for line in (ROOT / "archive/SoccerMaster_Logic_Foundation_v0.1.md").read_text().splitlines():
            if re.match(r"^\| [A-Z]+\d\d \|", line):
                parts = [x.strip() for x in line.strip("|").split("|")]
                self.original[parts[0]] = parts[1:]

    def check_bad(self, mutate):
        c = copy.deepcopy(self.catalog)
        mutate(c)
        with self.assertRaises(ValueError):
            v.validate_catalog(c, self.sources, self.original)

    def test_preservation_and_repository_integrity(self):
        self.assertEqual(v.validate()["scenarios"], 40)

    def test_reject_production_activation(self):
        self.check_bad(lambda c: c["scenarios"][0].update(production_enabled=True))

    def test_reject_duplicate_scenario(self):
        self.check_bad(lambda c: c["scenarios"][1].update(id=c["scenarios"][0]["id"]))

    def test_reject_unknown_reference(self):
        self.check_bad(lambda c: c["scenarios"][0].update(source_ids=["S999"]))

    def test_reject_rewritten_original(self):
        self.check_bad(lambda c: c["scenarios"][0]["original"].update(counter_response="Guaranteed win"))

    def test_reject_missing_activation_gate(self):
        self.check_bad(lambda c: c["scenarios"][0].update(required_before_activation=[]))

    def test_reject_false_calibration(self):
        self.check_bad(lambda c: c["scenarios"][0].update(calibration_status="validated"))

    def test_reject_runtime_ready_flag(self):
        self.check_bad(lambda c: c.update(runtime_ready=True))

    def test_reject_unknown_schema(self):
        self.check_bad(lambda c: c.update(schema_version="999"))

    def test_reject_nonfinite_and_duplicate_json_keys(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder) / "bad.json"
            for payload in ['{"x": NaN}', '{"x": Infinity}', '{"x": 1, "x": 2}']:
                p.write_text(payload)
                with self.assertRaises(ValueError):
                    v.read_json(p)

    def test_reject_oversized_override(self):
        self.check_bad(lambda c: c["scenarios"][0].update(
            audit_override={"cue_candidate_response": "a" * 2001, "counter_response": "hold"}))


if __name__ == "__main__":
    unittest.main()
