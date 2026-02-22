import { useState } from "react";
import {
  pingHealth,
  reverseGeocode,
  fetchWeather,
  getHistory,
} from "./services/weatherService";

type Status = "idle" | "loading" | "ok" | "error";

interface Result {
  label: string;
  value: unknown;
}

export default function App() {
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  async function run(label: string, fn: () => Promise<unknown>) {
    setStatus("loading");
    try {
      const value = await fn();
      setResults((prev) => [...prev, { label, value }]);
      setStatus("ok");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setResults((prev) => [...prev, { label, value: `ERROR: ${message}` }]);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 font-mono">
      <h1 className="text-2xl font-bold mb-6">Weather App — API Smoke Test</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          onClick={() => run("Health", pingHealth)}
        >
          Ping /health
        </button>

        <button
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          onClick={() => run("Reverse Geocode (Toronto coords)", () => reverseGeocode(43.7001, -79.4163))}
        >
          Reverse Geocode
        </button>

        <button
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          onClick={() => run("POST /weather (Toronto, CA)", () => fetchWeather({ city: "Toronto", country: "CA" }))}
        >
          Fetch Weather
        </button>

        <button
          className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          onClick={() =>
            run("GET /history", async () => {
              const history = await getHistory();
              console.log("History length:", history.length);
              return `${history.length} record(s) — see console`;
            })
          }
        >
          Get History
        </button>

        <button
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-slate-400"
          onClick={() => setResults([])}
        >
          Clear
        </button>
      </div>

      {status === "loading" && <p className="text-yellow-400 mb-4">Loading…</p>}

      <div className="space-y-4">
        {results.map((r, i) => (
          <div key={i} className="bg-slate-800 rounded p-4">
            <p className="text-slate-400 text-xs mb-2 uppercase tracking-wider">{r.label}</p>
            <pre className="text-sm text-green-300 whitespace-pre-wrap break-all">
              {typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}