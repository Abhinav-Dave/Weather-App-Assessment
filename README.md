# Full Stack Weather App

A production-quality full stack weather application built for the **PM Accelerator AI Engineer Intern technical assessment**. It uses real external APIs — OpenWeather for live weather data and geocoding — backed by a FastAPI REST API with PostgreSQL persistence, and a responsive React frontend.

---

## Features

- **Live weather search** — current conditions + 5-day forecast for any city
- **Browser geolocation** — "Use my location" reverse-geocodes coordinates to city/country
- **Packing suggestions** — deterministic recommendations based on temperature, wind, humidity, and rain forecast
- **Full CRUD** — create searches, view history, edit labels/notes, delete records
- **DB-level caching** — avoids redundant API calls within a configurable window (default 10 min)
- **CSV export** — download full weather history, optionally filtered by city
- **API call logging** — every outbound OpenWeather call is logged with latency and status
- **Responsive UI** — mobile-first design with desktop table and mobile card views
- **Toast notifications** — success/error feedback for all user actions
- **Friendly error messages** — mapped from HTTP codes to human-readable guidance

---

## Architecture
```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│         React + TypeScript + Tailwind (Vite)            │
│              localhost:5173 / Vercel                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (Axios)
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   FastAPI Backend                        │
│              localhost:8000 / Render                    │
│                                                         │
│  app/                                                   │
│  ├── api/        (routers: health, weather)             │
│  ├── core/       (config / pydantic settings)           │
│  ├── db/         (engine, session, base)                │
│  ├── models/     (Location, WeatherRequest,             │
│  │                WeatherCurrent, ForecastDay,          │
│  │                APILog)                               │
│  ├── schemas/    (pydantic request/response)            │
│  └── services/   (weather, cache, geocoding, api_log)   │
└────────────────────┬────────────────────────────────────┘
                     │ SQLAlchemy (sync) / psycopg2
                     ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL — Supabase (hosted)              │
│  Tables: locations, weather_requests, weather_current,  │
│          weather_forecast_days, api_logs                │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼ HTTP (requests)
┌─────────────────────────────────────────────────────────┐
│                  OpenWeather APIs                        │
│  • /geo/1.0/direct       (forward geocoding)            │
│  • /geo/1.0/reverse      (reverse geocoding)            │
│  • /data/2.5/weather     (current weather)              │
│  • /data/2.5/forecast    (5-day / 3-hour forecast)      │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v3, Axios, React Router v6 |
| Backend | FastAPI, Python 3.11, Uvicorn |
| ORM | SQLAlchemy 2.0 (sync) + psycopg2-binary |
| Database | PostgreSQL via Supabase |
| Config | Pydantic BaseSettings, python-dotenv |
| External APIs | OpenWeather (free tier — current + forecast + geocoding) |

---

## API Endpoints

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | DB connectivity check |
| `POST` | `/api/v1/weather/` | Fetch + store weather for a city |
| `GET` | `/api/v1/weather/history` | List stored weather requests |
| `PATCH` | `/api/v1/weather/{id}` | Update label / notes on a record |
| `DELETE` | `/api/v1/weather/{id}` | Delete a weather record |
| `GET` | `/api/v1/weather/export?format=csv` | Download history as CSV |
| `GET` | `/api/v1/weather/reverse-geocode?lat=&lon=` | Coords → city + country |

Interactive docs available at: **`http://localhost:8000/docs`**

---

## Local Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [OpenWeather](https://openweathermap.org/api) API key (free tier)

---

### Backend
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in DATABASE_URL and OPENWEATHER_API_KEY

# Run the server
uvicorn app.main:app --reload
```

Verify it's working:
```bash
curl http://localhost:8000/health
# → {"status":"ok","database":"connected"}
```

Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# .env.local already points to http://127.0.0.1:8000 by default

# Run the dev server
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Supabase PostgreSQL URI | `postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres?sslmode=require` |
| `OPENWEATHER_API_KEY` | OpenWeather API key | `abc123...` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `API_V1_PREFIX` | API route prefix | `/api/v1` |
| `PROJECT_NAME` | App name shown in docs | `Weather App API` |
| `WEATHER_CACHE_MINUTES` | Cache TTL in minutes | `10` |

### Frontend — `frontend/.env.local`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL | `http://127.0.0.1:8000` |

---

## Deployment

### Backend → Render

1. Push your repo to GitHub.

2. Go to [render.com](https://render.com) → **New → Web Service** → connect your GitHub repo.

3. Configure the service:

| Setting | Value |
|---|---|
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

4. Add environment variables in the Render dashboard under **Environment**:
```
DATABASE_URL        = postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres?sslmode=require
OPENWEATHER_API_KEY = your_key_here
FRONTEND_ORIGIN     = https://your-app.vercel.app
API_V1_PREFIX       = /api/v1
PROJECT_NAME        = Weather App API
WEATHER_CACHE_MINUTES = 10
PYTHON_VERSION = 3.11.9
```

5. Deploy. Your backend URL will be: `https://your-service.onrender.com`

---

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.

2. Configure the project:

| Setting | Value |
|---|---|
| **Root Directory** | `frontend` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

3. Add environment variable in Vercel dashboard under **Settings → Environment Variables**:
```
VITE_API_BASE_URL = https://your-service.onrender.com
```

4. Deploy. Your frontend URL will be: `https://your-app.vercel.app`

---

### Database — Supabase

No deployment needed — Supabase is already hosted. Tables are auto-created by `Base.metadata.create_all()` on backend startup.

To reset tables (development only), run in the Supabase SQL editor:
```sql
DROP TABLE IF EXISTS weather_forecast_days, weather_current, weather_requests, api_logs, locations CASCADE;
```

---

### Deploy Checklist
```
□ DATABASE_URL ends with ?sslmode=require (required by Supabase)
□ FRONTEND_ORIGIN on Render matches your exact Vercel URL (no trailing slash)
□ VITE_API_BASE_URL on Vercel matches your exact Render URL (no trailing slash)
□ Render start command uses --host 0.0.0.0 --port $PORT (not hardcoded 8000)
□ OpenWeather free-tier key has current weather + forecast + geocoding enabled
□ Re-deploy both services after changing any environment variable
□ Test /health on Render URL before testing the frontend
□ On free Render plan: first request after inactivity may take ~30s (cold start)
```

---

## Testing
```bash
# Health check
curl http://localhost:8000/health

# Fetch weather (creates DB record)
curl -s -X POST http://localhost:8000/api/v1/weather/ \
  -H "Content-Type: application/json" \
  -d '{"city": "Toronto", "country": "CA"}' | python -m json.tool

# Get history
curl http://localhost:8000/api/v1/weather/history | python -m json.tool

# Update label and notes (replace UUID)
curl -s -X PATCH http://localhost:8000/api/v1/weather/<uuid> \
  -H "Content-Type: application/json" \
  -d '{"label": "trip", "notes": "Pack a jacket."}' | python -m json.tool

# Delete a record (replace UUID)
curl -X DELETE http://localhost:8000/api/v1/weather/<uuid>

# Export CSV
curl "http://localhost:8000/api/v1/weather/export?format=csv" -o weather_export.csv

# Export filtered by city
curl "http://localhost:8000/api/v1/weather/export?format=csv&city=Toronto" -o toronto.csv

# Reverse geocode (Toronto coordinates)
curl "http://localhost:8000/api/v1/weather/reverse-geocode?lat=43.7001&lon=-79.4163"
```

---

### API Documentation

Available at `/docs` (Swagger UI) and `/redoc` when the backend is running.

### Assumptions & Limitations

- **OpenWeather free tier**: limited to 60 calls/minute and 1,000 calls/day. The caching layer (default 10 min TTL) minimizes API usage.
- **Render free tier**: services spin down after 15 minutes of inactivity. The first request after inactivity may take up to 30 seconds.
- **Forecast data**: OpenWeather free tier returns 3-hour interval forecasts (not daily). The backend aggregates these into 5 daily summaries.
- **Packing suggestions**: generated from deterministic heuristics on temperature, wind speed, humidity, and weather descriptions — not a machine learning model.
- **Authentication**: not implemented — this is a demonstration project.
- **Units**: all temperatures are in Celsius (metric).
