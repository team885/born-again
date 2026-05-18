# Born Again — Sales Intelligence Platform

A real-time sales analytics dashboard for Meron, Aman, and Gideon.

---

## What's included

- **5 tabs**: Dashboard, Charts, Goals, History, Team Leaderboard
- **Real-time sync** across all devices via Firebase Firestore
- **Persistent memory** — all-time history stored in the cloud, never lost
- **Weekly bar chart** — last 7 days of calls/appts/closed per rep
- **Goal tracking** — set daily targets, see live progress bars
- **History log** — every entry ever logged, scrollable
- **Day streaks** — tracked on the login screen

---

## Setup (one time, ~15 minutes)

### Step 1 — Get the code running locally

```bash
# Install dependencies
npm install

# Copy the env file
cp .env.example .env
```

### Step 2 — Create a Firebase project (free)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → name it `born-again` → click through
3. On the project dashboard, click the **"</>"** (Web) icon to add a web app
4. Name it `born-again-app`, click **Register app**
5. You'll see a `firebaseConfig` object — copy those values

### Step 3 — Enable Firestore

1. In the Firebase console left sidebar, click **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (you can add auth rules later)
4. Pick any region → **Enable**

### Step 4 — Fill in your .env file

Open the `.env` file and paste your Firebase values:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=born-again-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=born-again-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=born-again-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 5 — Test locally

```bash
npm run dev
```

Open http://localhost:5173 — should load the login screen.

---

## Deploy to Vercel (free, permanent URL)

### Option A — GitHub + Vercel (recommended, auto-deploys on every update)

1. Push this folder to a new GitHub repo
2. Go to **https://vercel.com** → sign in with GitHub
3. Click **"New Project"** → import your repo
4. Under **"Environment Variables"**, add all 6 `VITE_FIREBASE_*` values from your `.env`
5. Click **Deploy** — done! You'll get a URL like `born-again.vercel.app`

### Option B — Vercel CLI (deploy in 2 minutes from terminal)

```bash
npm install -g vercel
vercel
# Follow the prompts — it asks for your env vars
```

---

## Day-to-day use

1. Open the URL on any device (phone, laptop, anywhere)
2. Tap your name on the login screen
3. Hit **"+ LOG TODAY'S NUMBERS"** to enter your stats
4. Data saves instantly to the cloud and syncs to all 3 profiles

All entries are stored permanently. The **History tab** shows everything ever logged. The **Charts tab** shows last 7 days. **All Time** view in the header aggregates every entry since day one.

---

## Notes

- Data is shared in real-time — if Meron logs numbers, Aman sees them immediately on the Leaderboard
- Each rep's goals are stored independently (Meron can set 80 calls/day, Aman can set 60)
- Firebase free tier (Spark plan) allows 50,000 reads/day and 20,000 writes/day — more than enough
- To add more reps later, edit the `USERS` array at the top of `src/App.jsx`
