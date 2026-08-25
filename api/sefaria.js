// Proxy for Sefaria API — avoids client-side network blocks (firewalls, content filters)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { ref, steinsaltz } = req.query;
  if (!ref) return res.status(400).json({ error: 'missing ref' });

  // When ?steinsaltz=1: fetch the Steinsaltz commentary directly by constructing
  // "Steinsaltz on {ref}" — much faster than fetching all commentaries and filtering.
  const targetRef = steinsaltz === '1' ? `Steinsaltz on ${ref}` : ref;
  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(targetRef)}?lang=he&commentary=0&context=0`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Chavruta-App/1.0' },
      signal: AbortSignal.timeout(12000),
    });

    if (steinsaltz === '1') {
      // If Steinsaltz ref not found, return empty gracefully (don't propagate 404)
      if (!r.ok) {
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.json({ steinsaltz: [] });
      }
      const data = await r.json();
      let he = data.he;
      if (!Array.isArray(he)) {
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.json({ steinsaltz: [] });
      }
      if (Array.isArray(he[0])) he = he.flat();
      const _el = { innerHTML: '' }; // strip HTML tags via regex
      const entries = he
        .map((v, i) => ({
          ref: `${targetRef}:${i + 1}`,
          he: (typeof v === 'string' ? v : '').replace(/<[^>]+>/g, '').trim(),
        }))
        .filter(e => e.he.length > 0);

      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
      return res.json({ steinsaltz: entries });
    }

    if (!r.ok) return res.status(r.status).json({ error: 'sefaria_error' });
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.json(data);
  } catch {
    if (steinsaltz === '1') {
      // Steinsaltz fetch failure is non-fatal — return empty
      return res.json({ steinsaltz: [] });
    }
    return res.status(502).json({ error: 'sefaria_down' });
  }
}
