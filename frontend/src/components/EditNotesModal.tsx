import { useState } from "react";
import type { FormEvent } from "react";
import type { WeatherResponse } from "../services/types";
import { patchWeatherRequest } from "../services/weatherService";

interface Props {
  open: boolean;
  record: WeatherResponse;
  onSave: (updated: WeatherResponse) => void;
  onClose: () => void;
}

export default function EditNotesModal({ open, record, onSave, onClose }: Props) {
  const [label, setLabel] = useState(record.label ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (label.length > 32) { setError("Label must be 32 characters or fewer."); return; }
    if (notes.length > 500) { setError("Notes must be 500 characters or fewer."); return; }
    if (!label && !notes) { setError("Provide at least a label or notes."); return; }

    setSaving(true);
    setError(null);
    try {
      const updated = await patchWeatherRequest(record.id, {
        label: label || null,
        notes: notes || null,
      });
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Edit Notes</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <p className="text-sm text-slate-400">{record.city}, {record.country}</p>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Label <span className="text-slate-500">({label.length}/32)</span>
            </label>
            <input
              type="text"
              maxLength={32}
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. trip, work, home"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Notes <span className="text-slate-500">({notes.length}/500)</span>
            </label>
            <textarea
              maxLength={500}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Pack a jacket."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}