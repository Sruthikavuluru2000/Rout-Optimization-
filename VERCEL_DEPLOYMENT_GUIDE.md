# 🚀 Vercel Deployment Guide - Full Stack Route Optimization App

## 📋 Overview

This guide covers deploying your **complete full-stack application** (React frontend + FastAPI backend) on **Vercel** in a single deployment.

**Deployment Type:** Monolithic (Frontend + Backend on Vercel)

---

## ⚠️ Important Notes

### Vercel Constraints:
- **Serverless function size limit:** 50MB (compressed)
- **Execution timeout:** 10s (Hobby), 60s (Pro)
- **Cold start delays:** 3-10 seconds for Python functions
- **Package size:** Your backend is ~250MB - Vercel will attempt to optimize

### When to Consider Splitting:
- ❌ If deployment fails due to package size
- ❌ If optimization takes >60 seconds
- ❌ If you experience frequent timeouts
- ✅ You can easily migrate to split deployment later

---

## 📦 Pre-Deployment Checklist

### 1. MongoDB Atlas Setup (Required)

**Sign up for MongoDB Atlas:**
1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string:
   ```
   mongodb+srv://username:<password>@cluster.mongodb.net/
   ```
6. Replace `<password>` with your actual password
7. Under "Network Access" → Add IP: `0.0.0.0/0` (allow all)
8. Under "Database Access" → Create database user

**Create Database:**
- Database Name: `route_optimization`
- Collection: `scenarios` (auto-created by app)

---

### 2. Vercel Account Setup

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with GitHub account
3. Install Vercel GitHub App on your repository

---

## 🔧 Configuration Files Created

The following files have been created/updated:

### Root Directory:
- ✅ `vercel.json` - Main Vercel configuration
- ✅ `.env.template` - Environment variables template
- ✅ `.env.example` - Example environment file

### Frontend:
- ✅ `frontend/.vercelignore` - Files to exclude from deployment
- ✅ `frontend/.env.production` - Production environment variables
- ✅ `frontend/package.json` - Added `vercel-build` script

### Backend:
- ✅ `backend/.vercelignore` - Files to exclude from deployment
- ✅ `backend/runtime.txt` - Python version specification
- ✅ `backend/.python-version` - Python version for Vercel

---

## 🚀 Deployment Steps

### Method 1: Deploy via Vercel Dashboard (Easiest)

**Step 1: Connect Repository**
1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Click "Import"

**Step 2: Configure Project**
- **Framework Preset:** Other
- **Root Directory:** Leave as `./` (root)
- **Build Command:** Leave default or use: `cd frontend && npm run build`
- **Output Directory:** `frontend/build`

**Step 3: Add Environment Variables**

Click "Environment Variables" and add the following:

| Name | Value | Environment |
|------|-------|-------------|
| `MONGO_URL` | `mongodb+srv://...` | Production |
| `DB_NAME` | `route_optimization` | Production |
| `CORS_ORIGINS` | `*` | Production |
| `REACT_APP_BACKEND_URL` | Leave empty | Production |

**Step 4: Deploy**
1. Click "Deploy"
2. Wait 3-5 minutes for deployment
3. Vercel will provide you with a URL: `https://your-app.vercel.app`

---

### Method 2: Deploy via Vercel CLI

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Deploy**
```bash
# From the root directory
vercel

# Follow the prompts:
# Set up and deploy? Y
# Which scope? [Select your account]
# Link to existing project? N
# What's your project's name? route-optimization
# In which directory is your code located? ./
```

**Step 4: Add Environment Variables**
```bash
# Add MongoDB URL
vercel env add MONGO_URL production
# Paste your MongoDB connection string

# Add Database Name
vercel env add DB_NAME production
# Enter: route_optimization

# Add CORS Origins
vercel env add CORS_ORIGINS production
# Enter: *

# Frontend backend URL (leave empty for same-origin)
vercel env add REACT_APP_BACKEND_URL production
# Press Enter (leave empty)
```

**Step 5: Redeploy with Environment Variables**
```bash
vercel --prod
```

---

## ✅ Post-Deployment Verification

### 1. Check Backend API
Open in browser: `https://your-app.vercel.app/api/`

You should see:
```json
{"message": "Route Optimization API"}
```

### 2. Check Frontend
Open: `https://your-app.vercel.app`

You should see the dashboard with Upload button.

### 3. Test Full Flow

**Step-by-step test:**
1. Click "Download Template" - should download Excel file ✅
2. Upload the template file ✅
3. Click "Upload & Validate" - should show: 6 Cities, 3 Routes, 2 Truck Types ✅
4. Click "Run Optimization" - should complete in 5-15 seconds ✅
5. Enter scenario name and save ✅
6. View Results page - should show map, tables, metrics ✅
7. Go to Scenarios page - should show saved scenario ✅

---

## 🐛 Troubleshooting

### Issue 1: "Function payload is too large"

**Cause:** Backend dependencies exceed 50MB limit

**Solution:**
```bash
# Optimize requirements.txt - remove unused packages
# Or switch to split deployment (Render for backend)
```

### Issue 2: "Task timed out after 10.00 seconds"

**Cause:** Optimization taking too long on Hobby plan

**Solutions:**
- ✅ Upgrade to Vercel Pro ($20/month) - 60s timeout
- ✅ Optimize OR-Tools usage
- ✅ Split deployment (backend on Render)

### Issue 3: Backend API returns 404

**Check:**
1. Verify `backend/server.py` exists
2. Check `vercel.json` routes configuration
3. Ensure `requirements.txt` is in `backend/` directory
4. Check Vercel deployment logs

**Fix:**
```bash
# Check logs
vercel logs your-app.vercel.app

# Redeploy
vercel --prod --force
```

### Issue 4: CORS Errors

**Cause:** Backend not accepting frontend origin

**Fix:**
Update environment variable:
```bash
vercel env rm CORS_ORIGINS production
vercel env add CORS_ORIGINS production
# Enter: https://your-app.vercel.app,*
```

### Issue 5: MongoDB Connection Failed

**Check:**
1. MongoDB Atlas cluster is running
2. Connection string is correct (with password)
3. IP whitelist includes 0.0.0.0/0
4. Database user has read/write permissions

**Test connection:**
```bash
# Use MongoDB Compass or mongosh to test connection string
```

---

## 🔄 Update Deployment

### Push Updates:
```bash
git add .
git commit -m "Update application"
git push origin main
```

Vercel will automatically redeploy on every push to `main` branch.

### Manual Redeploy:
```bash
vercel --prod
```

---

## 📊 Monitor Deployment

### Vercel Dashboard:
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. View:
   - **Deployments:** History of all deployments
   - **Analytics:** Traffic and performance metrics
   - **Logs:** Real-time function logs
   - **Settings:** Environment variables, domains

### View Logs:
```bash
# Real-time logs
vercel logs --follow

# Last 100 logs
vercel logs
```

---

## 🎯 Custom Domain (Optional)

### Add Custom Domain:

**Via Dashboard:**
1. Go to Project Settings → Domains
2. Click "Add"
3. Enter your domain: `yourdomain.com`
4. Follow DNS configuration instructions

**Via CLI:**
```bash
vercel domains add yourdomain.com
```

---

## 📈 Performance Optimization

### 1. Reduce Cold Starts
- Upgrade to Vercel Pro (keeps functions warm)
- Reduce package dependencies
- Use Vercel Edge Functions for static content

### 2. Optimize Frontend
```bash
cd frontend
npm run build -- --analyze
```

### 3. Enable Caching
Already configured in `vercel.json` for static assets.

---

## 🔐 Security Best Practices

### 1. Environment Variables
- ✅ Never commit `.env` files
- ✅ Use Vercel environment variables
- ✅ Rotate MongoDB credentials regularly

### 2. CORS Configuration
Update for production:
```bash
vercel env add CORS_ORIGINS production
# Enter: https://yourdomain.com
```

### 3. MongoDB Security
- ✅ Use strong passwords
- ✅ Enable MongoDB Atlas encryption
- ✅ Restrict IP access if possible

---

## 💰 Cost Estimates

### Vercel Pricing:
- **Hobby (Free):** 
  - 100GB bandwidth/month
  - 100 serverless function executions/day
  - 10s timeout
  - ✅ Good for testing/personal use

- **Pro ($20/month):**
  - 1TB bandwidth/month
  - Unlimited executions
  - 60s timeout
  - ✅ Recommended for production

### MongoDB Atlas:
- **M0 Free Tier:**
  - 512MB storage
  - Shared RAM
  - ✅ Good for development/small scale

- **M10 ($57/month):**
  - 10GB storage
  - Dedicated resources
  - ✅ Production-ready

---

## 🔄 Migration Path (If Needed)

### When to Split:
- ⚠️ Deployment failures due to size
- ⚠️ Frequent timeouts (>10s)
- ⚠️ High serverless costs
- ⚠️ Need for background jobs

### How to Split Later:

**Frontend stays on Vercel:**
```bash
# Already configured - no changes needed
```

**Move Backend to Render:**
1. Create `backend/Procfile`:
   ```
   web: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```

2. Deploy backend to Render

3. Update frontend environment:
   ```bash
   vercel env add REACT_APP_BACKEND_URL production
   # Enter: https://your-backend.onrender.com
   ```

4. Redeploy frontend

---

## 📞 Support

### Get Help:
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Vercel Discord:** [vercel.com/discord](https://vercel.com/discord)
- **MongoDB Docs:** [docs.mongodb.com](https://docs.mongodb.com)

### Deployment Logs:
```bash
vercel logs --follow
```

---

## ✅ Deployment Complete!

Your app is now live at: **https://your-app.vercel.app**

**Next Steps:**
1. ✅ Test all features
2. ✅ Set up custom domain (optional)
3. ✅ Monitor performance and logs
4. ✅ Set up error tracking (Sentry, etc.)
5. ✅ Consider upgrading to Pro if needed

---

## 📝 Quick Reference

### Environment Variables (Required):
```env
MONGO_URL=mongodb+srv://...
DB_NAME=route_optimization
CORS_ORIGINS=*
REACT_APP_BACKEND_URL=
```

### Deployment Commands:
```bash
# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# Add environment variable
vercel env add VARIABLE_NAME production

# List deployments
vercel ls
```

### File Structure:
```
├── vercel.json           # Main config
├── frontend/
│   ├── package.json      # Added vercel-build script
│   ├── .env.production   # Frontend env vars
│   └── .vercelignore     # Ignore patterns
└── backend/
    ├── server.py         # FastAPI app
    ├── requirements.txt  # Python dependencies
    ├── runtime.txt       # Python version
    └── .vercelignore     # Ignore patterns
```

---

**🎉 Happy Deploying!**
