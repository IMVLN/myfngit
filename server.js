const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');
const axios = require('axios');
const { DateTime } = require('luxon');

const app = express();

app.set('trust proxy', 1);

app.use(session({
  secret: 'myfn2025',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const EPIC_CLIENT_ID = 'xyza7891SllfWwak4iZVChMe5KBubfvf';
const EPIC_CLIENT_SECRET = 'rv29Tq7UzyI2vP4gofBoevkIDkPxj6D10bLdfL79hOM';
const EPIC_REDIRECT = 'https://myfn.pro/auth/epic/callback';

let db;
try { admin.initializeApp(); db = admin.firestore(); } catch(e) {}

app.get('/login', (req, res) => {
  res.redirect(`https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&redirect_uri=${encodeURIComponent(EPIC_REDIRECT)}&response_type=code&scope=basic_profile account openid`);
});

app.get('/auth/epic/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) return res.status(400).send('<h1>No code</h1><a href="https://myfn.pro">Back</a>');

  try {
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: EPIC_REDIRECT }),
      { 
        auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    req.session.epic = tokenRes.data;

    res.status(200).send(`
      <!DOCTYPE html>
      <html><head><title>Logging in...</title>
      <script>window.location.href = "https://myfn.pro/profile";</script>
      </head>
      <body style="background:#0f0f1a;color:white;text-align:center;padding:50px;">
        <h2>Success! Taking you to your profile...</h2>
      </body></html>
    `);

  } catch (e) {
    res.send(`<h1>Login Error</h1><p>${e.response?.data?.error_description || e.message}</p>`);
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

app.get('/api/check', async (req, res) => {
  if (!req.session.epic) return res.json({ error: 'Not logged in' });
  // ... your existing /api/check code ...
});

app.listen(3000, () => console.log('MYFN backend running'));