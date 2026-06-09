# Deployment Checklist

## Vercel (Frontend)
Set these in: Vercel → Project → Settings → Environment Variables

| Variable | Value |
|---|---|
| `BACKEND_API_URL` | `https://your-railway-app.up.railway.app` |

Note: `NEXT_PUBLIC_API_URL=/api` is already in `.env.production` — do not add it to Vercel dashboard.

## Railway (Backend)
Set these in: Railway → ai-tutor service → Variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | (Railway PostgreSQL connection string) |
| `JWT_SECRET` | (generate: `openssl rand -hex 32`) |
| `LLM_API_KEY` | (your Groq API key) |
| `BACKEND_CORS_ORIGINS` | `https://your-vercel-app.vercel.app,http://localhost:3000` |
| `ENVIRONMENT` | `production` |
| `REDIS_URL` | (optional — Railway Redis addon URL if used) |

## Local Setup
Copy `.env.example` to `.env.local` and fill in `LLM_API_KEY`, `JWT_SECRET`.

## Verify Deployment
1. Visit your Vercel URL — landing page should load.
2. Sign up for a new account — should redirect to /dashboard.
3. Open /tutor, ask a question — streaming response should appear within 3s.
4. If tutor returns 502: BACKEND_API_URL is not set in Vercel dashboard.
5. If login fails silently: BACKEND_CORS_ORIGINS on Railway is missing your Vercel URL.
