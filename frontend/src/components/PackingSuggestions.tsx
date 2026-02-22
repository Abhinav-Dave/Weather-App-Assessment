import type { CurrentWeather, ForecastDay } from "../services/types";

interface Props {
  current: CurrentWeather;
  forecast: ForecastDay[];
}

interface Suggestion {
  icon: string;
  text: string;
}

function buildSuggestions(current: CurrentWeather, forecast: ForecastDay[]): Suggestion[] {
  const suggestions: Suggestion[] = [];

  const avgTemp = forecast.length
    ? forecast.reduce((sum, d) => sum + d.temp_avg, 0) / forecast.length
    : current.temperature;

  const maxWind = forecast.length
    ? Math.max(...forecast.map(d => current.wind_speed), current.wind_speed)
    : current.wind_speed;

  const hasRain = forecast.some(
    d =>
      ["Rain", "Drizzle", "Thunderstorm"].includes(d.weather_main) ||
      d.weather_description.toLowerCase().includes("rain")
  );

  // Temperature-based
  if (avgTemp <= 0) {
    suggestions.push({ icon: "🧥", text: "Heavy winter coat — temperatures are freezing" });
    suggestions.push({ icon: "🧤", text: "Gloves and a warm hat" });
    suggestions.push({ icon: "👢", text: "Insulated, waterproof boots" });
  } else if (avgTemp <= 10) {
    suggestions.push({ icon: "🧥", text: "Jacket or hoodie — it's chilly out there" });
    suggestions.push({ icon: "👖", text: "Long pants and warm layers" });
  } else if (avgTemp <= 20) {
    suggestions.push({ icon: "🧣", text: "Light jacket — mornings and evenings may be cool" });
    suggestions.push({ icon: "👕", text: "Layers you can peel off during the day" });
  } else {
    suggestions.push({ icon: "👕", text: "T-shirt and shorts — it's warm!" });
    suggestions.push({ icon: "🧴", text: "Sunscreen (SPF 30+)" });
    suggestions.push({ icon: "🕶", text: "Sunglasses" });
  }

  // Wind
  if (maxWind >= 10) {
    suggestions.push({ icon: "🌬", text: "Windbreaker — winds are strong" });
  }

  // Humidity
  if (current.humidity >= 80) {
    suggestions.push({ icon: "💨", text: "Breathable, moisture-wicking layers — high humidity" });
  }

  // Rain
  if (hasRain) {
    suggestions.push({ icon: "☂️", text: "Umbrella or rain jacket — rain in the forecast" });
    suggestions.push({ icon: "👟", text: "Waterproof shoes" });
  }

  // Cold extras
  if (avgTemp <= 10) {
    suggestions.push({ icon: "💋", text: "Lip balm and moisturizer — cold air is drying" });
  }

  // Universal
  suggestions.push({ icon: "💧", text: "Reusable water bottle" });
  suggestions.push({ icon: "🔋", text: "Phone charger / power bank" });

  return suggestions;
}

function TripSummary({ current, forecast }: Props) {
  const avgTemp = forecast.length
    ? forecast.reduce((sum, d) => sum + d.temp_avg, 0) / forecast.length
    : current.temperature;

  const maxWind = forecast.length
    ? Math.max(...forecast.map(d => current.wind_speed), current.wind_speed)
    : current.wind_speed;

  const hasRain = forecast.some(
    d =>
      ["Rain", "Drizzle", "Thunderstorm"].includes(d.weather_main) ||
      d.weather_description.toLowerCase().includes("rain")
  );

  return (
    <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-700">
      <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-slate-400">Avg temp (5d)</p>
        <p className="text-sm font-semibold mt-0.5">{Math.round(avgTemp)}°C</p>
      </div>
      <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-slate-400">Max wind</p>
        <p className="text-sm font-semibold mt-0.5">{maxWind.toFixed(1)} m/s</p>
      </div>
      <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-slate-400">Rain likely?</p>
        <p className={`text-sm font-semibold mt-0.5 ${hasRain ? "text-blue-400" : "text-green-400"}`}>
          {hasRain ? "Yes" : "No"}
        </p>
      </div>
    </div>
  );
}

export default function PackingSuggestions({ current, forecast }: Props) {
  const suggestions = buildSuggestions(current, forecast);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🎒</span>
        <h3 className="font-semibold text-base">What to Pack</h3>
      </div>

      <ul className="space-y-2">
        {suggestions.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="text-base leading-tight mt-0.5">{s.icon}</span>
            <span className="text-slate-300">{s.text}</span>
          </li>
        ))}
      </ul>

      <TripSummary current={current} forecast={forecast} />
    </div>
  );
}