# Deployment Guide for Render.com

This guide walks you through deploying the **ReafireChat** application to Render.com for free.

## What's Deployed
- **Backend**: FastAPI with PostgreSQL (Render.com free tier)
- **Frontend**: React static site served with Node.js
- **Database**: PostgreSQL (free tier)

## Prerequisites
1. GitHub account (free)
2. Render.com account (free signup at https://render.com)
3. Repository pushed to GitHub

## Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Create Backend Service on Render

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `reafirechat-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 2 -b 0.0.0.0:8000 -k uvicorn.workers.UvicornWorker main:app`
   - **Runtime**: Python 3.11

5. Add Environment Variables:
   - `DATABASE_URL`: (will be auto-set when you create PostgreSQL)
   - `ALLOWED_ORIGINS`: `https://reafirechat-frontend.onrender.com`

6. Click "Create Web Service"

## Step 3: Create PostgreSQL Database

1. In Render dashboard, click "New +" → "PostgreSQL"
2. Configure:
   - **Name**: `reafirechat-db`
   - **Database**: `reafirechat`
   - **User**: `reafirechat`
   - **Plan**: Free
3. Click "Create Database"

4. Copy the **Internal Database URL** and add it to your backend service:
   - Go to your backend service
   - Settings → Environment Variables
   - Add `DATABASE_URL` with the copied value

## Step 4: Create Frontend Service on Render

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `reafirechat-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s build -l 3000`
   - **Runtime**: Node

4. Add Environment Variables:
   - `REACT_APP_API_BASE`: `https://reafirechat-backend.onrender.com`

5. Click "Create Web Service"

## Step 5: Update Backend CORS

After both services are deployed:
1. Get your frontend URL (e.g., `https://reafirechat-frontend.onrender.com`)
2. Update your backend's `ALLOWED_ORIGINS` environment variable:
   ```
   https://reafirechat-frontend.onrender.com
   ```

## Step 6: Test the Deployment

1. Open your frontend URL in a browser
2. Create a room and join with a nickname
3. Open another device/browser and join the same room
4. Messages should sync in real-time via WebSockets

## Monitoring

- **View Logs**: Click on your service → "Logs"
- **Check Status**: Dashboard shows green/yellow/red status
- **Database**: Manage from Render dashboard

## Free Tier Limits
- Services spin down after 15 min of inactivity (startup ~30 sec)
- 0.5 CPU, 512 MB RAM per service
- 250 MB storage for PostgreSQL
- No egress charges

## Troubleshooting

**WebSocket Connection Refused**:
- Ensure CORS origins include your frontend URL
- Check that `REACT_APP_API_BASE` points to backend service

**Database Connection Error**:
- Verify `DATABASE_URL` is correctly set
- Use the Internal URL for backend ↔ database connection

**Blank Page**:
- Check browser console for API errors
- Verify environment variables are set correctly

## Cost Breakdown (Free Tier)
- **Backend**: Free
- **Frontend**: Free
- **Database**: Free (250 MB storage)
- **Total**: $0/month
