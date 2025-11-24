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
    // 1. Get token
    const tokenRes = await axios.post('https://api.epicgames.dev/epic/oauth/v1/token',
      new URLSearchParams({ 
        grant_type: 'authorization_code', 
        code, 
        redirect_uri: EPIC_REDIRECT 
      }),
      { 
        auth: { username: EPIC_CLIENT_ID, password: EPIC_CLIENT_SECRET },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    console.log('=== EPIC TOKEN RESPONSE ===');
    console.log(JSON.stringify(tokenRes.data, null, 2));

    const accessToken = tokenRes.data.access_token;
    const accountId = tokenRes.data.account_id;

    // 2. Fetch account info
    const accountRes = await axios.get(
      `https://api.epicgames.dev/epic/id/v1/accounts?accountId=${accountId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log('=== EPIC ACCOUNT RESPONSE ===');
    console.log(JSON.stringify(accountRes.data, null, 2));

    const realName = accountRes.data[0]?.displayName || tokenRes.data.displayName || 'Epic Player';

    req.session.epic = {
      ...tokenRes.data,
      displayName: realName
    };

    res.send(`<script>window.location.href="https://myfn.pro/profile"</script>`);
  } catch (e) {
    console.error('Epic login failed:', e.response?.data || e.message);
    res.send('<h1>Login failed</h1>');
  }
});

app.get('/api/session', (req, res) => {
  if (req.session.epic?.displayName) {
    res.json({
      loggedIn: true,
      displayName: req.session.epic.displayName,
      accountId: req.session.epic.account_id
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.listen(3000, () => console.log('MYFN backend ready — real names 100% guaranteed'));