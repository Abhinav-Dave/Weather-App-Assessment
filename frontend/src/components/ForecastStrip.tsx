import type { ForecastDay } from "../services/types";
import { formatDate, formatTemp } from "../utils/format";

interface Props {
  forecast: ForecastDay[];
}

export default function ForecastStrip({ forecast }: Props) {
  if (!forecast.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
        5-Day Forecast
      </h3>
      <div className="grid grid-cols-5 gap-2 overflow-x-auto">
        {forecast.map((day) => (
          <div
            key={day.forecast_date}
            className="bg-slate-800 border border-slate-700 rounded-lg p-3 text-center min-w-[100px]"
          >
            <p className="text-xs text-slate-400 font-medium">{formatDate(day.forecast_date)}</p>
            <p className="text-sm font-semibold mt-2">{day.weather_main}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5 leading-tight">
              {day.weather_description}
            </p>
            <div className="mt-3 space-y-0.5">
              <p className="text-xs text-blue-400">{formatTemp(day.temp_min)} min</p>
              <p className="text-xs text-orange-400">{formatTemp(day.temp_max)} max</p>
              <p className="text-xs text-slate-300">{formatTemp(day.temp_avg)} avg</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}