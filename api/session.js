// Tells the app whether a saved "keep me logged in" token is still valid.

const { checkToken } = require('./_token');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const secret = process.env.FRANCES_PASSWORD;

  if (!secret) {
    return res.status(500).json({ ok: false, error: 'FRANCES_PASSWORD is not set' });
  }

  const body = typeof req.body === 'object' && req.body !== null ? req.body : {};

  if (checkToken(body.token, secret)) {
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false });
};
