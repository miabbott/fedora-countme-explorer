#!/usr/bin/env python3
"""Build the browser data file from Fedora's published Count Me database."""

import argparse
import datetime as dt
import gzip
import json
import re
import shutil
import sqlite3
import tempfile
import urllib.request
from collections import defaultdict
from pathlib import Path

SOURCE_URL = "https://data-analysis.fedoraproject.org/csv-reports/countme/totals-countme.db.gz"
WEEK_SECONDS = 7 * 24 * 60 * 60
COUNTME_EPOCH = 345600
RELEASE_RE = re.compile(r"^updates-released-f(\d+)$")
REQUIRED_COLUMNS = {
    "hits", "weeknum", "os_name", "os_version", "os_variant", "os_arch",
    "sys_age", "repo_tag", "repo_arch",
}


def week_start(weeknum: int) -> dt.date:
    return dt.date(1970, 1, 5) + dt.timedelta(weeks=weeknum)


def download(source: str, destination: Path) -> None:
    with urllib.request.urlopen(source, timeout=120) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output)


def build_database(source_db: Path, output: Path, today: dt.date) -> None:
    cutoff = today - dt.timedelta(days=365 * 5)
    with sqlite3.connect(source_db) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(countme_totals)")}
        missing = REQUIRED_COLUMNS - columns
        if missing:
            raise ValueError(f"countme_totals is missing columns: {', '.join(sorted(missing))}")

        rows = connection.execute(
            """
            SELECT hits, weeknum, os_version, os_variant, os_arch, sys_age, repo_tag
            FROM countme_totals
            WHERE os_name = 'Fedora'
              AND sys_age >= 1
            """
        )
        aggregate = defaultdict(int)
        for hits, weeknum, version, variant, arch, age, repo_tag in rows:
            release_match = RELEASE_RE.fullmatch(repo_tag)
            if not release_match:
                continue
            start = week_start(int(weeknum))
            if start < cutoff:
                continue
            aggregate[(start.isoformat(), release_match.group(1), version, variant, arch, int(age))] += int(hits)

    records = [
        {
            "week": week,
            "release": release,
            "version": version,
            "variant": variant or "(none)",
            "arch": arch,
            "age": age,
            "hits": hits,
        }
        for (week, release, version, variant, arch, age), hits in sorted(aggregate.items())
    ]
    weeks = sorted({record["week"] for record in records})
    payload = {
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sourceUrl": SOURCE_URL,
        "sourceDate": today.isoformat(),
        "cutoff": cutoff.isoformat(),
        "weekStart": weeks[0] if weeks else None,
        "weekEnd": weeks[-1] if weeks else None,
        "records": records,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-db", type=Path, help="Existing SQLite database or compressed database")
    parser.add_argument("--output", type=Path, default=Path("public/data.json"))
    parser.add_argument("--source-url", default=SOURCE_URL)
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as directory:
        compressed = Path(directory) / "totals.db.gz"
        database = Path(directory) / "totals.db"
        if args.source_db:
            source = args.source_db
            if source.suffix == ".gz":
                with gzip.open(source, "rb") as input_file, database.open("wb") as output_file:
                    shutil.copyfileobj(input_file, output_file)
            else:
                database = source
        else:
            download(args.source_url, compressed)
            with gzip.open(compressed, "rb") as input_file, database.open("wb") as output_file:
                shutil.copyfileobj(input_file, output_file)
        build_database(database, args.output, dt.date.today())


if __name__ == "__main__":
    main()
