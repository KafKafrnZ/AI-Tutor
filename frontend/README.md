# Ascend AI — Frontend

Next.js 16 + React 19 + Tailwind v4 frontend for Ascend AI.

## Local Setup

```bash
cd frontend && npm install && cp .env.example .env.local
# Add BACKEND_API_URL to .env.local
npm run dev
```

## Key Architecture

- `proxy.ts`: Auth guard (Next.js 16 file convention — NOT middleware.ts)
- `app/api/[...path]/route.ts`: Reverse proxy to Railway backend
- `styles/tokens.css`: Design token definitions (use these, not raw Tailwind colors)

## Build

```bash
npm run build  # Validates env vars first via prebuild hook
```
