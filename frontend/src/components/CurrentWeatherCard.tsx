import type { WeatherResponse } from "../services/types";
import { formatDateTime, formatTemp } from "../utils/format";

interface Props {
  weather: WeatherResponse;
}

export default function CurrentWeatherCard({ weather }: Props) {
  const { current, city, country, label, notes } = weather;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{city}, {country}</h2>
          <p className="text-slate-400 text-sm capitalize">{current.weather_description}</p>
          <p className="text-slate-500 text-xs mt-1">
            Retrieved {formatDateTime(current.retrieved_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            weather.cached
              ? "bg-yellow-900/50 text-yellow-400 border border-yellow-700"
              : "bg-green-900/50 text-green-400 border border-green-700"
          }`}>
            {weather.cached ? "Cached" : "Live"}
          </span>
          <span className="text-4xl font-bold">{formatTemp(current.temperature)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Feels like", value: formatTemp(current.feels_like) },
          { label: "Humidity", value: `${current.humidity}%` },
          { label: "Wind", value: `${current.wind_speed} m/s` },
          { label: "Condition", value: current.weather_main },
        ].map(item => (
          <div key={item.label} className="bg-slate-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400">{item.label}</p>
            <p className="text-sm font-medium mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {(label || notes) && (
        <div className="border-t border-slate-700 pt-3 space-y-1">
          {label && (
            <p className="text-xs text-slate-400">
              Label: <span className="text-blue-400 font-medium">{label}</span>
            </p>
          )}
          {notes && <p className="text-xs text-slate-300 italic">"{notes}"</p>}
        </div>
      )}
    </div>
  );
}