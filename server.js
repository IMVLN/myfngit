const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');
const axios = require('axios');
const { DateTime } = require('luxon');

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Trust proxy (Vercel → Render)
app.set('trust proxy', 1);

// FIRESTORE SESSION STORE — survives everything, no extra package needed
app.use(session({
  secret: 'myfn2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days
  },
  // Custom Firestore store without external dependency
  store: {
    get: (sid, callback) => db.collection('sessions').doc(sid).get().then(doc => callback(null, doc.exists ? doc.data() : null)).catch(callback),
    set: (sid, sess, callback) => db.collection('sessions').doc(sid).set(sess).then(() => callback(null)).catch(callback),
    destroy: (sid, callback) => db.collection('sessions').doc(sid).delete().then(() => callback(null)).catch(callback)
  }
}));

const EPIC_CLIENT_ID = 'xyza7891SllfWwak4iZVChMe5KBubfvf';
const EPIC_CLIENT_SECRET = 'rv29Tq7UzyI2vP4gofBoevkIDkPxj6D10bLdfL79hOM';
const EPIC_REDIRECT = 'https://myfn.pro/auth/epic/callback';

// Routes
app.get('/login', (req, res) => {
  res.redirect(`https://www.epicgames.com/id/authorize?client_id=${EPIC_CLIENT_ID}&redirect_uri=${encodeURIComponent(EPIC_REDIRECT)}&response_type=code&scope=basic_profile account openid`);
});

app.get('/auth/epic/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('<h1>No code</h1>');

  try {
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: EPIC_REDIRECT }),
      { auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    req.session.epic = tokenRes.data;

    res.send(`<script>location.href="https://myfn.pro/profile"</script><h2>Success! Redirecting...</h2>`);
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

// your /api/check route stays exactly the same

app.listen(3000, () => console.log('MYFN LIVE — sessions in Firestore'));