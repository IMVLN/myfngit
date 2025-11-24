const express = require('express');
const session = require('express-session');
const FirestoreStore = require('firestore-store')(session);
const admin = require('firebase-admin');
const axios = require('axios');
const { DateTime } = require('luxon');

const app = express();

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// FIRESTORE SESSION STORE — survives everything
app.use(session({
  store: new FirestoreStore({
    database: db,
    collection: 'sessions'
  }),
  secret: 'myfn2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  }
}));

const EPIC_CLIENT_ID = 'xyza7891SllfWwak4iZVChMe5KBubfvf';
const EPIC_CLIENT_SECRET = 'rv29Tq7UzyI2vP4gofBoevkIDkPxj6D10bLdfL79hOM';
const EPIC_REDIRECT = 'https://myfn.pro/auth/epic/callback';

// ... keep all your routes exactly the same ...

app.get('/auth/epic/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code');

  try {
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: EPIC_REDIRECT }),
      { auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.epic = tokenRes.data;

    res.send(`<script>location.href="https://myfn.pro/profile"</script>`);
  } catch (e) {
    res.send('Login failed');
  }
});

app.get('/api/session', (req, res) => {
  if (req.session.epic) {
    res.json({
      loggedIn: true,
      displayName: req.session.epic.displayName || 'Player',
      accountId: req.session.epic.account_id
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ... rest of your code (login, /api/check, etc.) ...

app.listen(3000, () => console.log('MYFN backend with Firestore sessions'));