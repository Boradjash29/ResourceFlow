# 🚀 Deployment Guide: ResourceFlow

This guide walks you through deploying the ResourceFlow PERN stack to **Render** (Backend + Database) and **Vercel** (Frontend).

## 1. Prerequisites
- A GitHub repository with your code.
- Accounts on: [Supabase](https://supabase.com), [Render](https://render.com), and [Vercel](https://vercel.com).
- API keys for OpenAI/Gemini.

---

## 2. Deploy Database (Supabase) - "Forever Free"

Render's free database expires after 90 days. For a permanent free database, use Supabase.

1. Create a project on **Supabase**.
2. Go to **Project Settings** > **Database**.
3. Copy your **Connection String** (URI mode).
4. **IMPORTANT:** Enable `pgvector` by running this in the Supabase SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

## 3. Deploy Backend (Render)

1. Click **New +** > **Web Service**.
2. Connect your GitHub repo.
3. **Settings:**
   - **Name:** `resourceflow-api`
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
4. **Environment Variables:**
   - `DATABASE_URL`: Paste your Supabase Connection String.
   - `FRONTEND_URL`: Your Vercel URL (see step 4).
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`: (Random strings).
   - `OPENAI_API_KEY`, `EMAIL_USER`, `EMAIL_PASS`.

---

## 4. Deploy Frontend (Vercel)

Vercel is optimized for the React/Vite frontend.

1. Log in to **Vercel Dashboard**.
2. Click **New Project** and import your GitHub repository.
3. **Project Settings:**
   - **Framework Preset:** Vite.
   - **Root Directory:** `client`.
   - **Build Command:** `npm run build`.
   - **Output Directory:** `dist`.
4. **Environment Variables:**
   - Add `VITE_API_URL` and set it to your Render service URL + `/api` (e.g., `https://resourceflow-api.onrender.com/api`).
5. Click **Deploy**.
6. Once finished, visit your Vercel URL!

---

## 4. Final Sync

1. Go back to your **Render** service settings.
2. Ensure `FRONTEND_URL` exactly matches your Vercel deployment URL (without a trailing slash).
3. **Restart the Render service** to apply the CORS and session memory changes.

---

## 🛠️ Maintenance & Scaling

- **Database:** The `render.yaml` defaults to a free plan. For production data and `pgvector` persistence, consider upgrading to the "Starter" plan.
- **RAG Engine:** Monitor your `TOKEN_BUDGET` and `CACHE_THRESHOLD` via Render environment variables to optimize AI costs and performance.
