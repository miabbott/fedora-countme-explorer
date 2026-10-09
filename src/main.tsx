import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import * as echarts from "echarts";
import "./styles.css";
import { isShortLived, percentage } from "./metrics";

type Record = { week: string; release: string; version: string; variant: string; arch: string; age: number; hits: number };
type Data = { generatedAt: string; sourceUrl: string; weekStart: string; weekEnd: string; records: Record[] };
const ages: Record<number, string> = { 1: "0-1 weeks", 2: "2-4 weeks", 3: "5-24 weeks", 4: "25+ weeks" };

function Chart({ option }: { option: echarts.EChartsOption }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useEffect(() => { if (!element) return; const chart = echarts.init(element); chart.setOption(option); const resize = () => chart.resize(); window.addEventListener("resize", resize); return () => { window.removeEventListener("resize", resize); chart.dispose(); }; }, [element, option]);
  return <div className="chart" ref={setElement} role="img" aria-label="Interactive Count Me chart" />;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="control"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="all">All</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function App() {
  const [data, setData] = useState<Data | null>(null);
  const [release, setRelease] = useState("all"); const [variant, setVariant] = useState("all"); const [arch, setArch] = useState("all"); const [cohort, setCohort] = useState("all");
  const [range, setRange] = useState("all");
  useEffect(() => { fetch("./data.json").then((response) => response.json()).then(setData); }, []);
  const records = data?.records ?? [];
  const options = (key: keyof Record) => [...new Set(records.map((record) => String(record[key])))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const filtered = useMemo(() => { let result = records.filter((record) => (release === "all" || record.release === release) && (variant === "all" || record.variant === variant) && (arch === "all" || record.arch === arch) && (cohort === "all" || (cohort === "short" ? record.age <= 2 : record.age >= 3))); if (range !== "all" && data?.weekEnd) { const days = range === "13w" ? 91 : range === "6m" ? 183 : 365; const cutoff = new Date(data.weekEnd); cutoff.setDate(cutoff.getDate() - days); result = result.filter((record) => new Date(record.week) >= cutoff); } return result; }, [records, data, release, variant, arch, cohort, range]);
  const byWeek = useMemo(() => { const values = new Map<string, number>(); filtered.forEach((record) => values.set(record.week, (values.get(record.week) ?? 0) + record.hits)); return [...values.entries()].sort(); }, [filtered]);
  const byAge = useMemo(() => [1, 2, 3, 4].map((age) => ({ name: ages[age], values: byWeek.map(([week]) => filtered.filter((record) => record.week === week && record.age === age).reduce((sum, record) => sum + record.hits, 0)) })), [filtered, byWeek]);
  const latest = byWeek.at(-1)?.[0]; const latestRows = filtered.filter((record) => record.week === latest); const latestTotal = latestRows.reduce((sum, record) => sum + record.hits, 0); const short = latestRows.filter((record) => isShortLived(record.age)).reduce((sum, record) => sum + record.hits, 0);
  const trendOption = { color: ["#ffb000", "#ef8354", "#4f8fba", "#315c75"], tooltip: { trigger: "axis" }, legend: { bottom: 0 }, grid: { left: 48, right: 24, top: 24, bottom: 56 }, xAxis: { type: "category", data: byWeek.map(([week]) => week) }, yAxis: { type: "value" }, series: byAge.map((series) => ({ name: series.name, type: "line", stack: "age", areaStyle: {}, smooth: true, data: series.values })) };
  const releases = [...new Set(filtered.map((record) => record.version))]; const adoptionOption = { tooltip: { trigger: "axis" }, legend: { bottom: 0 }, grid: { left: 48, right: 24, top: 24, bottom: 56 }, xAxis: { type: "category", data: byWeek.map(([week]) => week) }, yAxis: { type: "value" }, series: releases.map((version) => ({ name: `Fedora ${version}`, type: "line", smooth: true, data: byWeek.map(([week]) => filtered.filter((record) => record.week === week && record.version === version).reduce((sum, record) => sum + record.hits, 0)) })) };
  if (!data) return <main className="loading">Loading Count Me data...</main>;
  return <main><header><p className="eyebrow">FEDORA INFRASTRUCTURE / COUNT ME</p><h1>How Fedora systems change over time.</h1><p className="intro">Explore weekly estimates of Fedora systems and the releases they report. Use lifecycle age as a transparent proxy for short-lived versus longer-lived installations.</p></header><section className="filters"><div className="filter-heading"><strong>Explore the data</strong><button onClick={() => { setRelease("all"); setVariant("all"); setArch("all"); setCohort("all"); setRange("all"); }}>Reset filters</button></div><div className="controls"><Select label="Date range" value={range} options={["13w", "6m", "1y"]} onChange={setRange} /><Select label="Fedora release" value={release} options={options("release")} onChange={setRelease} /><Select label="Variant" value={variant} options={options("variant")} onChange={setVariant} /><Select label="Architecture" value={arch} options={options("arch")} onChange={setArch} /><Select label="Lifecycle" value={cohort} options={["short", "long"]} onChange={setCohort} /></div></section><section className="stats"><article><span>Latest weekly estimate</span><strong>{latestTotal.toLocaleString()}</strong><small>{latest}</small></article><article><span>Short-lived systems</span><strong>{percentage(short, latestTotal)}%</strong><small>Age buckets 1-2</small></article><article><span>Weeks in view</span><strong>{byWeek.length}</strong><small>Filtered result</small></article></section><section className="panel"><div><p className="eyebrow">LIFECYCLE</p><h2>Short-lived versus long-lived</h2><p>Count Me age 1-2 covers systems up to four weeks old; age 3-4 covers systems five weeks or older.</p></div><Chart option={trendOption} /></section><section className="panel"><div><p className="eyebrow">ADOPTION</p><h2>Fedora release mix</h2><p>Weekly Count Me totals by reported Fedora version.</p></div><Chart option={adoptionOption} /></section><footer>Updated {new Date(data.generatedAt).toLocaleString()} · <a href={data.sourceUrl}>Upstream Count Me data</a> · Estimates are weekly aggregate hits, not a census.</footer></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
