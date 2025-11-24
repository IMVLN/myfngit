const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');
const axios = require('axios');

const app = express();

app.set('trust proxy', 1);
app.use(session({
  secret: 'myfn2025',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'none' }
}));

const EPIC_CLIENT_ID = 'xyza7891SllfWwak4iZVChMe5KBubfvf';
const EPIC_CLIENT_SECRET = 'rv29Tq7UzyI2vP4gofBoevkIDkPxj6D10bLdfL79hOM';
const EPIC_REDIRECT = 'https://myfn.pro/auth/epic/callback';

try { admin.initializeApp(); } catch(e) {}

app.get('/login', (req, res) => {
  res.redirect(`https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&redirect_uri=${encodeURIComponent(EPIC_REDIRECT)}&response_type=code&scope=basic_profile%20account%20openid`);
});

app.get('/auth/epic/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('<h1>No code</h1>');

  try {
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: EPIC_REDIRECT }),
      { 
        auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    req.session.epic = tokenRes.data;

    res.send(`
      <script>window.location.href = "https://myfn.pro/profile"</script>
      <h2 style="text-align:center;color:white;background:#0f0f1a;padding:50px;">
        Success! Taking you to your profile...
      </h2>
    `);
  } catch (e) {
    res.send('<h1>Login failed</h1>');
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

app.listen(3000, () => console.log('MYFN backend ready'));