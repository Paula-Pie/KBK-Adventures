// Vercel Serverless Function — wipes the KBK Office leaderboard.
// Invoked automatically by the Vercel Cron entry in vercel.json, which
// authenticates itself with the CRON_SECRET env var (Vercel adds the
// `Authorization: Bearer <CRON_SECRET>` header for its own cron calls).
// Can also be triggered manually with the same header for testing.

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const LEADERBOARD_KEY = 'kbk-office:leaderboard';
const META_KEY = 'kbk-office:meta';

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

module.exports = async (req, res) => {
  if (!REST_URL || !REST_TOKEN) {
    return res.status(500).json({ error: 'Baza danych nie jest skonfigurowana.' });
  }

  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${expected}`) {
      return res.status(401).json({ error: 'Brak autoryzacji.' });
    }
  }

  try {
    await redis(['DEL', LEADERBOARD_KEY, META_KEY]);
    return res.status(200).json({ ok: true, reset: true, at: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: 'Błąd serwera: ' + err.message });
  }
};
