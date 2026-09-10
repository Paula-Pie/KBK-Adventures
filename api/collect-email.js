// Vercel Serverless Function — stores marketing-opt-in emails separately
// from the public leaderboard, so they can be exported after the event.
//
// POST { email, nick, score, consent } -> saves it (requires consent === true)
// GET  ?key=ADMIN_SECRET               -> dumps all collected emails as JSON

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const EMAILS_KEY = 'kbk-office:emails'; // hash: email -> JSON { nick, score, ts }

async function redis(command) {
  const res = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result;
}

function sanitizeEmail(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!REST_URL || !REST_TOKEN) {
    return res.status(500).json({ error: 'Baza danych nie jest skonfigurowana.' });
  }

  try {
    if (req.method === 'GET') {
      const expected = process.env.ADMIN_SECRET;
      if (!expected || req.query.key !== expected) {
        return res.status(401).json({ error: 'Brak autoryzacji.' });
      }
      const raw = await redis(['HGETALL', EMAILS_KEY]);
      const entries = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ email: raw[i], ...JSON.parse(raw[i + 1]) });
      }

      if (req.query.format === 'csv') {
        const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
        const rows = [['nick', 'wynik', 'email', 'data'].join(',')];
        entries
          .sort((a, b) => (b.score || 0) - (a.score || 0))
          .forEach((e) => {
            rows.push([esc(e.nick || ''), esc(e.score || 0), esc(e.email), esc(new Date(e.ts).toISOString())].join(','));
          });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="kbk-office-emaile.csv"');
        return res.status(200).send('﻿' + rows.join('\r\n'));
      }

      return res.status(200).json({ emails: entries });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const email = sanitizeEmail(body.email);
      const nick = typeof body.nick === 'string' ? body.nick.slice(0, 20) : '';
      const score = Number(body.score) || 0;

      if (!email) return res.status(400).json({ error: 'Nieprawidłowy adres e-mail.' });
      if (body.consent !== true) return res.status(400).json({ error: 'Wymagana zgoda.' });

      await redis(['HSET', EMAILS_KEY, email, JSON.stringify({ nick, score, ts: Date.now() })]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Błąd serwera: ' + err.message });
  }
};
