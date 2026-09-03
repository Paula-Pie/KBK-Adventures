// Vercel Serverless Function (Node.js runtime, no npm deps).
// Backed by a Redis store via the Upstash REST API — works with Vercel's
// "Storage -> Redis" integration (env vars are injected automatically),
// or any standalone Upstash Redis database.
//
// Env vars needed (either naming works):
//   KV_REST_API_URL / KV_REST_API_TOKEN        (Vercel-managed Redis)
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (standalone Upstash)

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LEADERBOARD_KEY = 'kbk-office:leaderboard'; // sorted set: member=nick, score=best score
const META_KEY = 'kbk-office:meta'; // hash: nick -> JSON { score, ts }
const MAX_SCORE = 5000; // loose anti-cheat ceiling (see README for how it's derived)
const TOP_N = 20;

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

function sanitizeNick(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().slice(0, 20);
  if (trimmed.length < 2) return null;
  if (!/^[\p{L}0-9 _.\-]+$/u.test(trimmed)) return null;
  return trimmed;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!REST_URL || !REST_TOKEN) {
    return res.status(500).json({ error: 'Baza danych nie jest skonfigurowana (brak KV_REST_API_URL/TOKEN).' });
  }

  try {
    if (req.method === 'GET') {
      // ZREVRANGE key 0 N-1 WITHSCORES
      const raw = await redis(['ZREVRANGE', LEADERBOARD_KEY, '0', String(TOP_N - 1), 'WITHSCORES']);
      const entries = [];
      for (let i = 0; i < raw.length; i += 2) {
        entries.push({ nick: raw[i], score: Number(raw[i + 1]) });
      }
      return res.status(200).json({ leaderboard: entries });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const nick = sanitizeNick(body.nick);
      const score = Number(body.score);

      if (!nick) return res.status(400).json({ error: 'Nieprawidłowy nick (2-20 znaków, litery/cyfry/spacje).' });
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ error: 'Nieprawidłowy wynik.' });
      }

      const current = await redis(['ZSCORE', LEADERBOARD_KEY, nick]);
      const currentScore = current === null ? -1 : Number(current);
      let best = currentScore;

      if (score > currentScore) {
        await redis(['ZADD', LEADERBOARD_KEY, String(score), nick]);
        await redis(['HSET', META_KEY, nick, JSON.stringify({ score, ts: Date.now() })]);
        best = score;
      }

      const rankRaw = await redis(['ZREVRANK', LEADERBOARD_KEY, nick]);
      const rank = rankRaw === null ? null : rankRaw + 1;

      return res.status(200).json({ ok: true, best, rank, improved: score > currentScore });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Błąd serwera: ' + err.message });
  }
};
