// Checks the password the visitor typed against FRANCES_PASSWORD.
// This runs on the server, so the real password never reaches the browser.

const crypto = require('crypto');
const { makeToken } = require('./_token');

// Compares two strings without leaking how many characters matched.
// Both sides are hashed first so the buffers are always the same length.
function sameSecret(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest();
  const hashB = crypto.createHash('sha256').update(String(b)).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

module.exports = async (req, res) => {
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
  const entered = typeof body.password === 'string' ? body.password : '';

  // small delay so someone guessing over and over gets slowed down
  await new Promise((resolve) => setTimeout(resolve, 400));

  if (sameSecret(entered, secret)) {
    // the token is what lets her stay logged in if she ticks the box
    return res.status(200).json({ ok: true, token: makeToken(secret) });
  }

  return res.status(401).json({ ok: false });
};
