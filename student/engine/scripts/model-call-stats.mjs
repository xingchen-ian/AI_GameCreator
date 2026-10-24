// Summarises model-call latency from one or more research-export JSON files.
//
//   node scripts/model-call-stats.mjs research-export-*.json
//
// Download an export while signed in:  /api/research-export?projectId=<id>
import { readFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/model-call-stats.mjs <research-export.json> [...]");
  process.exit(1);
}

const calls = files.flatMap((file) => {
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(parsed.modelCalls)) throw new Error(`${file} has no modelCalls array`);
  return parsed.modelCalls;
});

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function summarize(rows) {
  const durations = rows.map((row) => row.durationMs).sort((a, b) => a - b);
  const outputs = rows.map((row) => row.outputTokens).filter((value) => typeof value === "number");
  const inputs = rows.map((row) => row.inputTokens).filter((value) => typeof value === "number");
  const mean = (values) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  return {
    n: rows.length,
    "avg s": +(mean(durations) / 1000).toFixed(1),
    "p50 s": +(percentile(durations, 0.5) / 1000).toFixed(1),
    "p90 s": +(percentile(durations, 0.9) / 1000).toFixed(1),
    "max s": +(durations[durations.length - 1] / 1000).toFixed(1),
    "avg in tok": mean(inputs),
    "avg out tok": mean(outputs),
    "out tok/s": mean(outputs) && mean(durations) ? +(mean(outputs) / (mean(durations) / 1000)).toFixed(1) : null,
    repaired: rows.filter((row) => row.outcome === "repaired").length,
    failed: rows.filter((row) => row.outcome === "failed").length,
    "strict fallback": rows.filter((row) => row.strictFallback).length,
  };
}

function group(rows, keyOf) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return Object.fromEntries([...groups].map(([key, items]) => [key, summarize(items)]));
}

console.log(`\n${calls.length} model calls from ${files.length} file(s)\n`);
console.log("By operation (slowest average first):");
const byOperation = group(calls, (row) => `${row.operation} [${row.purpose ?? row.role}]`);
console.table(Object.fromEntries(Object.entries(byOperation).sort((a, b) => b[1]["avg s"] - a[1]["avg s"])));

console.log("By model:");
console.table(group(calls, (row) => row.model));

// Calls made for the same user action start within a few seconds of each other
// and run one after another, so adding them up shows what the user waits for.
const sorted = [...calls].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const chats = [];
for (const call of sorted) {
  if (call.operation !== "game_design_coach_response") continue;
  const end = new Date(call.createdAt).getTime();
  const assessment = [...sorted].reverse().find((item) => item.operation === "game_design_coach_assessment" && new Date(item.createdAt).getTime() <= end && end - new Date(item.createdAt).getTime() < 120_000);
  if (assessment) chats.push(assessment.durationMs + call.durationMs);
}
if (chats.length) {
  chats.sort((a, b) => a - b);
  console.log(`Chat turn (assessment + response, model time only): n=${chats.length}, p50=${(percentile(chats, 0.5) / 1000).toFixed(1)}s, p90=${(percentile(chats, 0.9) / 1000).toFixed(1)}s`);
}
