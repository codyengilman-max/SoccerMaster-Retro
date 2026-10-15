"""Validate this draft research package; does not validate a game engine."""
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_SHA256 = "e45f8e5eaff31d2f2781f1109f05f6353aff37c83af9c021ceabb91a010f481b"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_json(path):
    require(path.stat().st_size <= 2_000_000, "Research JSON exceeds size limit")
    def reject_constant(value):
        raise ValueError("Nonfinite JSON number: " + value)
    def no_duplicates(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "Duplicate JSON key: " + key)
            result[key] = value
        return result
    return json.loads(path.read_text(), parse_constant=reject_constant,
                      object_pairs_hook=no_duplicates)


def validate_catalog(catalog, source_ids, original_rows):
    require(catalog.get("schema_version") == "0.2", "Unknown catalog version")
    require(catalog.get("artifact_kind") == "authoring_seed_catalog", "Wrong artifact kind")
    require(catalog.get("runtime_ready") is False, "Draft catalog cannot be runtime-ready")
    rows = catalog.get("scenarios")
    require(isinstance(rows, list) and len(rows) == 40, "Expected 40 preserved seeds")
    ids = [row.get("id") for row in rows]
    require(len(set(ids)) == 40, "Duplicate scenario ID")
    require(set(ids) == set(original_rows), "Original seed identity changed")
    fields = ["focal_role_and_situation", "cue_candidate_response", "counter_response"]
    required = {"typed_entry_and_abort_predicates", "spatial_fixture", "rules_profile",
                "perception_snapshot", "teammate_and_opponent_responsibilities",
                "timing_and_feasibility", "outcome_branches", "runtime_acceptance_results",
                "documented_calibration_or_explicit_prototype_status"}
    for row in rows:
        require(row.get("schema_version") == "0.2", "Seed version mismatch")
        require(row.get("status") == "draft_seed", "Unvalidated seed status changed")
        require(row.get("production_enabled") is False, "Production activation forbidden")
        require(row.get("calibration_status") == "not_calibrated", "Unsupported calibration claim")
        require(row.get("evidence_status") == "authored_design_not_empirically_validated",
                "Unsupported validation claim")
        require(isinstance(row.get("source_ids"), list), "Missing source list")
        require(set(row["source_ids"]) <= source_ids, "Unknown source reference")
        require(isinstance(row.get("required_before_activation"), list), "Missing activation gates")
        require(set(row["required_before_activation"]) >= required, "Missing activation requirement")
        require(row.get("original") == dict(zip(fields, original_rows[row["id"]])),
                "Original scenario wording changed")
        for value in row["original"].values():
            require(isinstance(value, str) and 0 < len(value) <= 2000, "Invalid seed text")
        override = row.get("audit_override")
        if override is not None:
            require(isinstance(override, dict) and
                    set(override) == {"cue_candidate_response", "counter_response"},
                    "Invalid override fields")
            require(all(isinstance(v, str) and 0 < len(v) <= 2000
                        for v in override.values()), "Invalid override text")


def validate(root=ROOT):
    original = (root / "archive/SoccerMaster_Logic_Foundation_v0.1.md").read_bytes()
    require(hashlib.sha256(original).hexdigest() == ORIGINAL_SHA256, "Original archive changed")
    text = original.decode()
    original_rows = {}
    for line in text.splitlines():
        if re.match(r"^\| [A-Z]+\d\d \|", line):
            values = [v.strip() for v in line.strip("|").split("|")]
            original_rows[values[0]] = values[1:]
    register = read_json(root / "data/evidence_register.json")
    sources = register["sources"]
    source_ids = {s["id"] for s in sources}
    require(len(sources) == 18 and source_ids == {f"S{i}" for i in range(1, 19)},
            "Source identity/count mismatch")
    original_urls = {m[0]: m[1] for m in re.findall(
        r"^(S\d+)\. .+?: (https://\S+)\s*$", text, re.M)}
    for source in sources:
        require(source["url"] == original_urls[source["id"]], "Source URL altered")
        require(all(source[k] is False for k in
                    ["causal_validation", "youth_calibration", "runtime_validation",
                     "full_dataset_analyzed", "raw_source_redistributed"]),
                "Unsupported source validation or redistribution claim")
    catalog = read_json(root / "data/scenario_catalog.json")
    validate_catalog(catalog, source_ids, original_rows)
    ledger = read_json(root / "data/coverage_ledger.json")
    expected = [f"{y}/{str(y+1)[2:]}" for y in range(2016, 2026)]
    require([s["season"] for s in ledger["seasons"]] == expected, "Ten-season ledger mismatch")
    for season in ledger["seasons"]:
        require(season["status"] in {"selected_articles_only", "not_extracted"},
                "Unsupported season status")
        require(set(season["source_ids"]) <= source_ids, "Unknown season source")
        require(all(season[k] is False for k in
                    ["all_matches_analyzed", "full_report_reviewed",
                     "event_dataset_ingested", "parameters_fitted"]),
                "Unsupported decade completion claim")
    claims = read_json(root / "data/statistical_claims.json")["claims"]
    require(len({c["id"] for c in claims}) == len(claims) == 8, "Claim count/identity mismatch")
    for c in claims:
        require(c["source_id"] in source_ids, "Unknown claim source")
        require(c["action_probability"] is False and c["raw_data_checked"] is False
                and c["youth_transfer_validated"] is False, "Unsupported empirical inference")
        for key in ["numerator", "denominator"]:
            v = c[key]
            require(v is None or (type(v) is int and v >= 0), "Invalid count")
        require(c["denominator"] is None or c["denominator"] > 0, "Zero denominator")
    contract = (root / "contracts/ENGINE_CONTRACT.md").read_text()
    cases = read_json(root / "data/runtime_acceptance.json")
    require(cases["status"] == "requirements_not_executed", "Runtime tests misrepresented")
    require(len({c["id"] for c in cases["cases"]}) == len(cases["cases"]) == 14,
            "Runtime case identity/count mismatch")
    for case in cases["cases"]:
        require(case["status"] == "not_run" and case["evidence"] is None,
                "Runtime validation claimed without execution")
        require("## " + case["contract"] + " —" in contract, "Unknown contract reference")
    for path in root.rglob("*.md"):
        if ".git" in path.parts:
            continue
        for target in re.findall(r"\]\(([^)]+)\)", path.read_text()):
            if "://" in target or target.startswith("#"):
                continue
            require((path.parent / target.split("#")[0]).exists(), "Broken local Markdown link")
    return {"archive_sha256": ORIGINAL_SHA256, "scenarios": 40, "sources": 18,
            "seasons": 10, "runtime_requirements_not_run": 14}


if __name__ == "__main__":
    print(json.dumps(validate(), indent=2))

