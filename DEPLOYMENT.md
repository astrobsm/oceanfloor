# Deploying OceanFloor on Vercel + Supabase

This guide walks through deploying the **frontend (Vite SPA)** and the
**backend (FastAPI as a Vercel serverless function)** on Vercel, with
**Supabase Postgres** as the managed database.

The `statistical-service` (SciPy / statsmodels) is **not** included in
the Vercel bundle because of size and cold-start constraints. Deploy it
separately on Fly.io / Railway / Render / a small VM if you need the
Analysis panel — point the backend at it by setting
`STATISTICAL_SERVICE_URL` on Vercel.

---

## 1. Create the Supabase Postgres database

1. Go to <https://supabase.com/> and create a new project. Region: pick one
   close to your Vercel region (default is `us-east-1` / `iad1`).
2. Open **Project Settings → Database → Connection string → URI**.
   Copy the connection string. It looks like:
   ```
   postgresql://postgres:<your-password>@db.<project-ref>.supabase.co:5432/postgres
   ```
3. Strongly recommended: also note the **Connection pooler** URI (port
   `6543`, "Transaction" mode) — this is the one to use from Vercel
   serverless functions because each invocation is short-lived:
   ```
   postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```

## 2. Create the schema (one-time)

From your laptop, point the bootstrap script at Supabase:

```powershell
cd c:\Users\user\oceanFloor\backend
$env:DATABASE_URL = "postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres"
..\.venv\Scripts\python.exe -m app.core.bootstrap
```

You should see `[bootstrap] done. Tables:` followed by every table
including `collab_shares`, `collab_participants`, `collab_activity`.

## 3. Push the repo to GitHub

```powershell
cd c:\Users\user\oceanFloor
git init
git branch -M main
git add .
git commit -m "Initial commit: OceanFloor with GWIFOE + collaboration"
git remote add origin https://github.com/astrobsm/oceanfloor.git
git push -u origin main
```

## 4. Create the Vercel project

1. Go to <https://vercel.com/new> and import `astrobsm/oceanfloor`.
2. Vercel detects `vercel.json` at the repo root. Leave the defaults:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
3. Under **Environment Variables**, add the values below
   (apply each to **Production**, **Preview**, **Development**):

| Variable | Example | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `production` | Disables dev DB auto-init on cold starts |
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres` | **Use the Supabase pooler** for serverless |
| `SECRET_KEY` | _generate a 64-char random string_ | JWT / session signing |
| `CORS_ORIGINS` | `https://oceanfloor.vercel.app` | Comma-separate to add more |
| `CORS_ORIGIN_REGEX` | `^https://oceanfloor-.*\.vercel\.app$` | Allows every preview deploy |
| `LITERATURE_CONTACT_EMAIL` | `you@example.org` | Required by NCBI E-utilities |
| `LLM_PROVIDER` | `mock` (or `openai` / `azure` / `anthropic`) | |
| `OPENAI_API_KEY` | `sk-...` | Only if `LLM_PROVIDER=openai` |
| `STATISTICAL_SERVICE_URL` | `https://oceanfloor-stats.fly.dev` | Optional |

4. Click **Deploy**.

## 5. Verify

After the first deploy, hit:
- `https://oceanfloor.vercel.app/` — the SPA loads
- `https://oceanfloor.vercel.app/health` — `{"status":"ok",...}`
- `https://oceanfloor.vercel.app/api/v1/grants/funders` — JSON list of 18 funders

Create a project from the UI, open the **Collaborators** tab, mint a
share link + participant PIN, then open the share URL in an incognito
window to verify the round trip.

## 6. Troubleshooting

- **`Connection refused` to Supabase** — make sure you used the
  pooler URI (port `6543`), not the direct port `5432`, and that the
  password is URL-encoded if it contains `@` / `:` / `/`.
- **`Failed to compile: psycopg2` on Vercel** — `psycopg2-binary` is
  in `api/requirements.txt`; double-check Vercel built the function
  (look at the build log for `Installing requirements.txt`).
- **Frontend can't reach backend** — confirm `frontend/.env.production`
  has `VITE_API_BASE_URL=/api/v1` (relative). Vercel rewrites
  `/api/v1/*` to the Python function (see `vercel.json`).
- **Statistical Analysis panel returns 500** — `STATISTICAL_SERVICE_URL`
  is unset or pointing at a private host. Deploy `statistical-service`
  separately, or hide the panel for now.
- **Free-tier function timeout (10 s)** — long-running grant scoring
  jobs may time out. Upgrade the function `maxDuration` in `vercel.json`
  (Pro plan goes to 60 s) or move heavy work to a queue.
