const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');
const axios = require('axios');
const { DateTime } = require('luxon');

const app = express();

// Fix for Vercel/Render proxy + cross-origin cookies
app.set('trust proxy', 1);
app.use(session({
  secret: 'myfn2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, 
    sameSite: 'none', 
  }
}));

const EPIC_CLIENT_ID = 'xyza7891SllfWwak4iZVChMe5KBubfvf';
const EPIC_CLIENT_SECRET = 'rv29Tq7UzyI2vP4gofBoevkIDkPxj6D10bLdfL79hOM';
const EPIC_REDIRECT = 'https://myfn.pro/auth/epic/callback';

let db;
try { admin.initializeApp(); db = admin.firestore(); } catch(e) {}

app.get('/login', (req, res) => {
  console.log('Login route hit — redirecting to Epic');
  res.redirect(`https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&redirect_uri=${encodeURIComponent(EPIC_REDIRECT)}&response_type=code&scope=basic_profile account openid`);
});

app.get('/auth/epic/callback', async (req, res) => {
  const code = req.query.code;
  console.log('Callback hit with code:', code ? 'present' : 'missing');

  if (!code) {
    console.log('ERROR: No code — sending error page');
    return res.status(400).send('<h1>No code received</h1><a href="https://myfn.pro">Go back</a>');
  }

  try {
    console.log('Starting token exchange...');
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ 
        grant_type: 'authorization_code', 
        code, 
        redirect_uri: EPIC_REDIRECT 
      }),
      { 
        auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }  // ← THIS IS THE FIX
      }
    );

    console.log('Token exchange SUCCESS');
    req.session.epic = tokenRes.data;

    // BULLETPROOF REDIRECT TO PROFILE
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Logging you in...</title>
          <script>
            window.location.href = "https://myfn.pro/profile";
          </script>
        </head>
        <body style="background:#0f0f1a;color:white;text-align:center;padding:50px;">
          <h2>Success! Taking you to your profile...</h2>
        </body>
      </html>
    `);

  } catch (e) {
    console.log('TOKEN EXCHANGE FAILED:', e.response?.data || e.message);
    res.send(`<h1>Login Error</h1><p>${e.response?.data?.error_description || e.message}</p><a href="https://myfn.pro">Try again</a>`);
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

  const now = DateTime.utc();
  const userRef = db.collection('users').doc(req.session.epic.account_id);
  let user = (await userRef.get()).data() || { checks: 0, month: now.month };
  if (user.month !== now.month) { user.checks = 0; user.month = now.month; }
  if (user.checks >= 3) return res.json({ error: '3 checks used this month' });

  user.checks += 1;
  await userRef.set(user);

  res.json({
    totalUSD: '$127.43',
    totalVB: 28500,
    estSpent: 26100,
    checksLeft: 3 - user.checks,
    nextReset: 'Dec 1, 2025'
  });
});

app.listen(3000, () => console.log('MYFN backend running'));