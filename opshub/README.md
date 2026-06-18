# OpsHub — Red River Siding Operations Platform

Full-stack operations management platform built for Red River Siding & Eavestroughs Ltd.

## Tech Stack
- **Frontend**: React 18
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **File Storage**: Cloudflare R2
- **Hosting**: Railway
- **Push Notifications**: Web Push (VAPID)

---

## Local Development

### Prerequisites
- Node.js 18+ (LTS)
- PostgreSQL database

### Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Configure environment**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your values
   ```

3. **Generate VAPID keys for push notifications**
   ```bash
   cd server
   node -e "const wp=require('web-push'); const keys=wp.generateVAPIDKeys(); console.log('Public:', keys.publicKey); console.log('Private:', keys.privateKey);"
   ```
   Add these to your `.env` file.

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

---

## Railway Deployment

### Step 1 — Create GitHub repo
1. Go to github.com → New repository
2. Name it `opshub`
3. Upload all these files

### Step 2 — Deploy on Railway
1. Go to railway.app → New Project
2. Choose "Deploy from GitHub repo"
3. Select your `opshub` repo

### Step 3 — Add PostgreSQL
1. In Railway → Add Service → PostgreSQL
2. Railway auto-sets `DATABASE_URL`

### Step 4 — Set environment variables
In Railway → your app service → Variables, add:
```
NODE_ENV=production
JWT_SECRET=<generate a long random string>
R2_ACCOUNT_ID=<from Cloudflare>
R2_ACCESS_KEY_ID=<from Cloudflare R2>
R2_SECRET_ACCESS_KEY=<from Cloudflare R2>
R2_BUCKET_NAME=opshub-files
R2_PUBLIC_URL=<your R2 bucket URL>
VAPID_PUBLIC_KEY=<generated above>
VAPID_PRIVATE_KEY=<generated above>
VAPID_EMAIL=mailto:you@yourdomain.com
CLIENT_URL=https://yourdomain.com
```

### Step 5 — Run migrations
In Railway → your app → Shell:
```bash
node server/db/migrate.js
```

### Step 6 — Add custom domain
1. Railway → Settings → Domains → Add custom domain
2. Enter: `opshub.yourdomain.com`
3. Copy the CNAME record Railway gives you
4. Add it to your domain's DNS settings in Namecheap

---

## Updating the app

When Claude makes changes:
1. Download the new files
2. Replace the old files in your local folder
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update from Claude"
   git push
   ```
4. Railway auto-redeploys in ~3 minutes

---

## Default Login
- Username: `owner`
- Password: `owner123`
- **Change this immediately after first login!**

---

## Cloudflare R2 Setup

1. Login to cloudflare.com → R2
2. Create bucket named `opshub-files`
3. Settings → R2 API Tokens → Create token (read + write)
4. Copy Account ID, Access Key, Secret Key into `.env`
