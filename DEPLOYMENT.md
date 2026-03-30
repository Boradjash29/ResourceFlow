# 🚀 Deployment Guide: ResourceFlow

This guide walks you through deploying the ResourceFlow PERN stack to **Render** (Backend + Database) and **Vercel** (Frontend).

## 1. Prerequisites
- A GitHub repository containing the latest codebase.
- Accounts on [Render.com](https://render.com) and [Vercel.com](https://vercel.com).
- An OpenAI (or Gemini) API key for the RAG engine.

---

## 2. Deploy Backend & Database (Render)

Render uses the included `render.yaml` to automatically provision everything.

1. Log in to **Render Dashboard**.
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will detect `render.yaml` and show:
   - **resourceflow-db** (PostgreSQL Database)
   - **resourceflow-api** (Node.js Web Service)
5. **Configuration during setup:**
   - Set `FRONTEND_URL` to your future Vercel URL (e.g., `https://resourceflow-client.vercel.app`).
   - Provide your `EMAIL_USER`, `EMAIL_PASS`, and `OPENAI_API_KEY`.
6. Click **Approve**.
7. Once deployed, copy your Render service URL (e.g., `https://resourceflow-api.onrender.com`).

---

## 3. Deploy Frontend (Vercel)

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
