// Vercel Serverless Function backing the heart/like buttons in the Lavori grid.
// Requires a Vercel KV store linked to the project (Storage tab -> Create Database
// -> KV) so the KV_REST_API_URL / KV_REST_API_TOKEN env vars are set automatically.
const { kv } = require('@vercel/kv');

const ALLOWED_IDS = [
  'work-1', 'work-2', 'work-3', 'work-4', 'work-5', 'work-6', 'work-7', 'work-8',
];

module.exports = async function handler(req, res) {
  const id = req.method === 'GET' ? req.query.id : req.body && req.body.id;

  if (!id || !ALLOWED_IDS.includes(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  const key = 'like:' + id;

  if (req.method === 'GET') {
    const count = (await kv.get(key)) || 0;
    return res.status(200).json({ id, count });
  }

  if (req.method === 'POST') {
    const liked = !!(req.body && req.body.liked);
    let count = await kv.incrby(key, liked ? 1 : -1);
    if (count < 0) {
      count = 0;
      await kv.set(key, 0);
    }
    return res.status(200).json({ id, count });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
