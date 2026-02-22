import { useState } from "react";
import type { WeatherResponse } from "../services/types";
import { fetchWeather, reverseGeocode } from "../services/weatherService";
import { friendlyError } from "../utils/errors";
import { useAppToast } from "../components/Layout";
import SearchForm from "../components/SearchForm";
import CurrentWeatherCard from "../components/CurrentWeatherCard";
import ForecastStrip from "../components/ForecastStrip";
import PackingSuggestions from "../components/PackingSuggestions";
import ErrorBanner from "../components/ErrorBanner";
import LoadingSkeleton from "../components/LoadingSkeleton";

const QUICK_CITIES = [
  { city: "Toronto", country: "CA" },
  { city: "Vancouver", country: "CA" },
  { city: "Montreal", country: "CA" },
];

export default function HomePage() {
  const { showToast } = useAppToast();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefillCity, setPrefillCity] = useState("");
  const [prefillCountry, setPrefillCountry] = useState("CA");
  const [locating, setLocating] = useState(false);

  async function handleSearch(city: string, country: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWeather({ city, country });
      setWeather(result);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const geo = await reverseGeocode(lat, lon);
          setPrefillCity(geo.city);
          setPrefillCountry(geo.country);
          await handleSearch(geo.city, geo.country);
        } catch (err) {
          setError(friendlyError(err));
        } finally {
          setLocating(false);
        }
      },
      (posErr) => {
        setLocating(false);
        if (posErr.code === posErr.PERMISSION_DENIED) {
          showToast("info", "Location denied — search manually or allow access in browser settings.");
          setError("Location access denied. Search manually or enable location in your browser.");
        } else if (posErr.code === posErr.POSITION_UNAVAILABLE) {
          setError("Location unavailable. Try searching manually.");
        } else {
          setError("Location request timed out. Try searching manually.");
        }
      },
      { timeout: 10000 }
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-xl font-bold">Weather Search</h1>
        <SearchForm
          onSubmit={handleSearch}
          loading={loading}
          initialCity={prefillCity}
          initialCountry={prefillCountry}
        />
        <button
          onClick={handleUseLocation}
          disabled={locating || loading}
          className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:underline"
        >
          <span>📍</span>
          {locating ? "Detecting location…" : "Use my location"}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {loading && <LoadingSkeleton />}

      {!loading && weather && (
        <div className="space-y-4">
          <CurrentWeatherCard weather={weather} />
          <ForecastStrip forecast={weather.forecast} />
          <PackingSuggestions current={weather.current} forecast={weather.forecast} />
        </div>
      )}

      {!loading && !weather && !error && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center space-y-4">
          <p className="text-4xl">🌍</p>
          <p className="text-slate-300 font-medium">Search a city to view the weather</p>
          <p className="text-slate-500 text-sm">Or try a quick search:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_CITIES.map(({ city, country }) => (
              <button
                key={city}
                onClick={() => {
                  setPrefillCity(city);
                  setPrefillCountry(country);
                  handleSearch(city, country);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}