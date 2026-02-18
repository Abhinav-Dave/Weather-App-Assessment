# Backend Section 1: Core Infrastructure Layer

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| Server | Uvicorn |
| Database | PostgreSQL (Supabase) |
| ORM | SQLAlchemy 2 (sync) |
| Config | Pydantic BaseSettings |
| Python | 3.11 |

## Setup
```bash
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in DATABASE_URL in .env
uvicorn app.main:app --reload
```

## Supabase DATABASE_URL

1. Supabase dashboard → Settings → Database → Connection string → URI
2. Paste into `.env` as `DATABASE_URL`
3. Append `?sslmode=require`

## Test DB Connectivity
```bash
curl http://localhost:8000/health
```

Expected:
```json
{"status": "ok", "database": "connected"}
```

## Expected Console Output
```
Starting Weather App API v0.1.0
Database connection: OK
Database tables verified
Application startup complete.
```

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ValidationError: DATABASE_URL` | Missing .env or variable | Copy .env.example → .env, set DATABASE_URL |
| `SSL connection required` | Missing sslmode param | Append `?sslmode=require` to DATABASE_URL |
| `connection refused` | Wrong host | Verify project ref in Supabase URL |
| `password authentication failed` | Wrong password | Reset in Supabase dashboard |
| `CORS error` | Wrong FRONTEND_ORIGIN | Match to your React dev server port |

## Section 2 Extension Points

- Add models under `app/models/`, inherit `Base`
- Import models in `app/db/base.py` before `create_all()`
- Add routers in `main.py` under `settings.API_V1_PREFIX`
