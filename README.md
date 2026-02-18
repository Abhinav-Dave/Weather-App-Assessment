# Weather-App-Assessment
# Backend Section 1: Core Infrastructure Layer

FastAPI backend for the Full Stack Weather Application internship assessment.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI 0.111 |
| Server | Uvicorn |
| Database | PostgreSQL (Supabase) |
| ORM | SQLAlchemy 2 (sync) |
| Config | Pydantic BaseSettings |
| Python | 3.11 |

---

## Setup

### 1. Clone and enter the backend directory
```bash
cd backend
```

### 2. Create a virtual environment
```bash
python3.11 -m venv venv
source venv/bin/activate   class=class="str">"cm"># Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
class=class="str">"cm"># Open .env and fill in your DATABASE_URL class="kw">from Supabase
```

### 5. Run the server
```bash
uvicorn app.main:app --reload
```

---

## Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Navigate to: **Settings → Database → Connection string → URI**
3. Copy the URI and paste into `.env` as `DATABASE_URL`
4. Append `?sslmode=require` to the end of the URL

---

## Test DB Connectivity

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{ class="str">"status": class="str">"ok", class="str">"database": class="str">"connected" }
```

---

## Expected Console Output (Success)

```
INFO     | app.main | 🚀 Starting Weather App API v0.1.0
INFO     | app.main | ✅ Database connection: OK
INFO     | app.main | ✅ Database tables verified
INFO     | uvicorn.error | Application startup complete.
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ValidationError: DATABASE_URL` | Missing .env file or variable | Copy .env.example → .env and fill DATABASE_URL |
| `SSL connection required` | Missing sslmode | Append `?sslmode=require` to DATABASE_URL |
| `connection refused` | Wrong host/port | Double-check Supabase project ref in URL |
| `password authentication failed` | Wrong password | Reset DB password in Supabase dashboard |
| `CORS error in browser` | Wrong FRONTEND_ORIGIN | Set FRONTEND_ORIGIN to match your React dev server port |

---

## API Docs

Once the server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

---

## Architecture Notes

- **Clean layered architecture**: core (config) → db (engine/session) → api (routes) → main (wiring)
- **No circular imports**: each layer only imports class="kw">from layers below it
- **Dependency injection**: `get_db()` provides per-request sessions, auto-closed on completion
- **Fail-fast config**: missing env vars raise errors at class="kw">import time, not at first DB call
- **Section 2 ready**: add models to `app/models/`, class="kw">import in `app/db/base.py`, add routers in `main.py`
