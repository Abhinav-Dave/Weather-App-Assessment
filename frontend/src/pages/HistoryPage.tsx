import { useEffect, useState } from "react";
import type { WeatherResponse } from "../services/types";
import {
  getHistory,
  deleteWeatherRequest,
  exportCsv,
} from "../services/weatherService";
import { friendlyError } from "../utils/errors";
import { useAppToast } from "../components/Layout";
import ErrorBanner from "../components/ErrorBanner";
import EditNotesModal from "../components/EditNotesModal";
import { formatDateTime, formatTemp } from "../utils/format";

interface HistoryItem {
  id: string;
  city: string;
  country: string;
  created_at: string;
  temperature: number;
  weather_main: string;
  weather_description: string;
  label: string | null;
  notes: string | null;
}

export default function HistoryPage() {
  const { showToast } = useAppToast();
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getHistory();
      setRecords(data as unknown as HistoryItem[]);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this weather record?")) return;
    setDeletingId(id);
    try {
      await deleteWeatherRequest(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast("success", "Entry deleted ✅");
    } catch (err) {
      showToast("error", friendlyError(err));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSaved(updated: WeatherResponse) {
    setRecords(prev => prev.map(r =>
      r.id === updated.id
        ? { ...r, label: updated.label, notes: updated.notes }
        : r
    ));
    setEditing(null);
    showToast("success", "Notes updated ✅");
  }

  async function handleExport() {
    setExporting(true);
    showToast("info", "Download starting…");
    try {
      await exportCsv();
    } catch (err) {
      showToast("error", friendlyError(err));
    } finally {
      setExporting(false);
    }
  }

  function toEditRecord(r: HistoryItem): WeatherResponse {
    return {
      id: r.id,
      city: r.city,
      country: r.country,
      latitude: 0,
      longitude: 0,
      current: {
        temperature: r.temperature,
        feels_like: 0,
        humidity: 0,
        wind_speed: 0,
        weather_main: r.weather_main,
        weather_description: r.weather_description,
        retrieved_at: r.created_at,
      },
      forecast: [],
      cached: false,
      created_at: r.created_at,
      label: r.label,
      notes: r.notes,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Weather History</h1>
        <button
          onClick={handleExport}
          disabled={exporting || records.length === 0}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {exporting ? "Downloading…" : "⬇ Export CSV"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-700 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && records.length === 0 && !error && (
        <div className="text-center py-20 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>No history yet. Search a city on the home page first.</p>
        </div>
      )}

      {!loading && records.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-left">
                  <th className="pb-2 pr-4 font-medium">Location</th>
                  <th className="pb-2 pr-4 font-medium">Retrieved</th>
                  <th className="pb-2 pr-4 font-medium">Temp</th>
                  <th className="pb-2 pr-4 font-medium">Condition</th>
                  <th className="pb-2 pr-4 font-medium">Label / Notes</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 pr-4 font-medium">{r.city}, {r.country}</td>
                    <td className="py-3 pr-4 text-slate-400">{formatDateTime(r.created_at)}</td>
                    <td className="py-3 pr-4">{formatTemp(r.temperature)}</td>
                    <td className="py-3 pr-4 capitalize text-slate-300">{r.weather_description}</td>
                    <td className="py-3 pr-4">
                      {r.label && <span className="text-blue-400 text-xs font-medium">{r.label}</span>}
                      {r.notes && <p className="text-slate-400 text-xs italic truncate max-w-[150px]">{r.notes}</p>}
                      {!r.label && !r.notes && <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(r)}
                          className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          disabled={deletingId === r.id}
                          className="text-xs px-3 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-md disabled:opacity-50 transition-colors"
                        >
                          {deletingId === r.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {records.map(r => (
              <div key={r.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{r.city}, {r.country}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(r.created_at)}</p>
                  </div>
                  <span className="text-lg font-bold">{formatTemp(r.temperature)}</span>
                </div>
                <p className="text-sm text-slate-300 capitalize">{r.weather_description}</p>
                {r.label && <span className="inline-block text-xs text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded-full">{r.label}</span>}
                {r.notes && <p className="text-xs text-slate-400 italic">"{r.notes}"</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditing(r)}
                    className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="flex-1 text-xs py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-md disabled:opacity-50 transition-colors"
                  >
                    {deletingId === r.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <EditNotesModal
          open={true}
          record={toEditRecord(editing)}
          onSave={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
