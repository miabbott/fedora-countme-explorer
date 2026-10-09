import json
import sqlite3
from datetime import date

from scripts.build_data import build_database, week_start


def make_db(path):
    with sqlite3.connect(path) as db:
        db.execute("CREATE TABLE countme_totals (hits INTEGER, weeknum TEXT, os_name TEXT, os_version TEXT, os_variant TEXT, os_arch TEXT, sys_age TEXT, repo_tag TEXT, repo_arch TEXT)")
        db.executemany("INSERT INTO countme_totals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
            (10, "3000", "Fedora", "40", "workstation", "x86_64", "1", "updates-released-f40", "x86_64"),
            (20, "3000", "Fedora", "40", "workstation", "x86_64", "4", "updates-released-f40", "x86_64"),
            (30, "3000", "Fedora", "40", "workstation", "x86_64", "4", "fedora-f40", "x86_64"),
            (40, "3000", "CentOS Stream", "9", "", "x86_64", "4", "updates-released-f9", "x86_64"),
        ])


def test_build_filters_and_aggregates(tmp_path):
    source = tmp_path / "source.db"
    output = tmp_path / "data.json"
    make_db(source)
    build_database(source, output, date(2028, 1, 1))
    payload = json.loads(output.read_text())
    assert len(payload["records"]) == 2
    assert sum(record["hits"] for record in payload["records"]) == 30
    assert payload["records"][0]["variant"] == "workstation"


def test_week_start():
    assert week_start(0).isoformat() == "1970-01-05"
