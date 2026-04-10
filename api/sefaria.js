// Proxy for Sefaria API — avoids client-side network blocks (firewalls, content filters)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { ref } = req.query;
  if (!ref) return res.status(400).json({ error: 'missing ref' });

  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?lang=he&commentary=0&context=0`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Chavruta-App/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return res.status(r.status).json({ error: 'sefaria_error' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch {
    return res.status(502).json({ error: 'sefaria_down' });
  }
}
