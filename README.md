# Fedora Count Me Explorer

![Pylint](https://github.com/miabbott/fedora-countme-explorer/actions/workflows/pylint.yml/badge.svg)

Static GitHub Pages dashboard for exploring Fedora Count Me data. The dashboard
shows weekly aggregate estimates, release adoption, and lifecycle cohorts for
the most recent five years.

## Development

The data build uses Python and the frontend uses React, TypeScript, Vite, and
Apache ECharts.

```sh
python -m pip install pytest
pytest
python scripts/build_data.py --source-db /path/to/totals-countme.db.gz
npm install
npm run dev
```

The weekly GitHub Actions workflow downloads the upstream compressed SQLite
database, writes `public/data.json`, builds the site, and deploys it to Pages.
The generated data file is intentionally ignored by git.

## Data notes

Count Me is a privacy-preserving weekly aggregate of DNF requests. It is an
estimate, not a census. The dashboard restricts data to `os_name = Fedora`
and `updates-released-f<N>` repositories. Age buckets are the upstream
installation-lifetime buckets: 1 (0-1 weeks), 2 (2-4 weeks), 3 (5-24 weeks),
and 4 (25+ weeks). The dashboard groups buckets 1-2 as short-lived and 3-4
as long-lived; this is a lifecycle proxy and does not identify CI systems.

The original single-variant CSV exporter remains in `main.py` as historical
code. New work should use `scripts/build_data.py` and the dashboard workflow.

```
usage: main.py [-h] [-a] [-d DIR] [-o OUTPUT] [-u] variant

positional arguments:
  variant               Name of the os_variant to query

options:
  -h, --help            show this help message and exit
  -a, --all             Query stats from all time; default is last year
  -d DIR, --dir DIR     Directory to download totals.db and write out CSV file; defaults to $CWD
  -o OUTPUT, --output OUTPUT
                        Filename to write results in CSV format; defaults to 'stats.csv'
  -u, --update          Force update of totals.dbr
```
