const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '1mb' }));

// tags.json живе на Railway volume (RAILWAY_VOLUME_MOUNT_PATH ставиться автоматично при підключенні volume)
const DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const FILE = path.join(DIR, 'tags.json');

// CORS — дашборд статичний і може жити де завгодно
app.use((req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Password'
  });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Публічне читання тегів
app.get('/api/tags', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(FILE, 'utf8')));
  } catch (e) {
    res.json({ tags: [], assignments: {} });
  }
});

// Запис — тільки з паролем адміна (повний перезапис об'єкта)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminM3';
app.post('/api/tags', (req, res) => {
  if (req.get('X-Admin-Password') !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'unauthorized' });
  const b = req.body;
  if (!b || !Array.isArray(b.tags) || typeof b.assignments !== 'object' || Array.isArray(b.assignments))
    return res.status(400).json({ error: 'bad payload: expected {tags:[],assignments:{}}' });
  try {
    fs.writeFileSync(FILE, JSON.stringify({ tags: b.tags, assignments: b.assignments }));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'write failed: ' + e.message });
  }
});

// Конфіг (CSV-лінки): читання публічне, запис — тільки адмін
const CONFIG_FILE = path.join(DIR, 'config.json');
app.get('/api/config', (req, res) => {
  try {
    res.json(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
  } catch (e) {
    res.json({ u1: '', u2: '' });
  }
});
app.post('/api/config', (req, res) => {
  if (req.get('X-Admin-Password') !== ADMIN_PASSWORD)
    return res.status(401).json({ error: 'unauthorized' });
  const b = req.body;
  if (!b || typeof b.u1 !== 'string' || typeof b.u2 !== 'string')
    return res.status(400).json({ error: 'bad payload: expected {u1,u2}' });
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ u1: b.u1, u2: b.u2 }));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'write failed: ' + e.message });
  }
});

const SELF_TRACKER_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTxO8V7iTxVL9SXui__9xNJG6Fk6LxTNr0RJhqQonfA8aR6MWCD-w37ooi3iH4C0KlN6WbCIGXNTJj-/pub?output=csv';
function fetchUrl(url, hops) {
  const https = require('https');
  const http = require('http');
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'AppTrack/1.0' } }, (res) => {
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc && hops > 0) {
        const next = loc.startsWith('http') ? loc : new URL(loc, url).href;
        res.resume();
        return resolve(fetchUrl(next, hops - 1));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error('HTTP ' + res.statusCode));
        else resolve(data);
      });
    }).on('error', reject);
  });
}
app.get('/api/self-tracker', (req, res) => {
  fetchUrl(SELF_TRACKER_CSV, 5).then((t) => {
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' });
    res.send(t);
  }).catch((e) => {
    res.status(502).json({ error: 'tracker fetch failed: ' + e.message });
  });
});

// Статика: сам дашборд (index.html) з кореня репозиторію
app.use(express.static(path.join(__dirname, '..')));

app.listen(process.env.PORT || 3000, () => console.log('AppTrack up'));
