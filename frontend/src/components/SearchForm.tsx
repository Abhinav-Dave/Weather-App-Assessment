import { useState } from "react";
import type { FormEvent } from "react";

const COUNTRY_OPTIONS = [
  { label: "Canada (CA)", value: "CA" },
  { label: "United States (US)", value: "US" },
  { label: "United Kingdom (GB)", value: "GB" },
  { label: "Australia (AU)", value: "AU" },
  { label: "India (IN)", value: "IN" },
  { label: "Other…", value: "OTHER" },
];

interface Props {
  onSubmit: (city: string, country: string) => void;
  loading: boolean;
  initialCity?: string;
  initialCountry?: string;
}

export default function SearchForm({ onSubmit, loading, initialCity = "", initialCountry = "CA" }: Props) {
  const isKnown = COUNTRY_OPTIONS.some(o => o.value === initialCountry && o.value !== "OTHER");
  const [city, setCity] = useState(initialCity);
  const [selectedCountry, setSelectedCountry] = useState(isKnown ? initialCountry : "OTHER");
  const [customCountry, setCustomCountry] = useState(isKnown ? "" : initialCountry);
  const [error, setError] = useState<string | null>(null);

  // Sync when parent prefills via geolocation
  useState(() => {
    setCity(initialCity);
    const known = COUNTRY_OPTIONS.some(o => o.value === initialCountry && o.value !== "OTHER");
    setSelectedCountry(known ? initialCountry : "OTHER");
    if (!known) setCustomCountry(initialCountry);
  });

  const effectiveCountry = selectedCountry === "OTHER" ? customCountry : selectedCountry;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!city.trim()) { setError("City is required."); return; }
    if (!effectiveCountry || effectiveCountry.length !== 2) {
      setError("Country must be a 2-letter code (e.g. CA, US)."); return;
    }
    onSubmit(city.trim(), effectiveCountry.toUpperCase());
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="City (e.g. Toronto)"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            aria-label="Country"
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {COUNTRY_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {selectedCountry === "OTHER" && (
          <input
            type="text"
            placeholder="XX"
            maxLength={2}
            value={customCountry}
            onChange={e => setCustomCountry(e.target.value.toUpperCase())}
            className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-center uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}