// Helpers for the "keep me logged in" token.
// A token looks like  1767225600000.9f2c...  (expiry time + signature).
// The signature is made with a key built from FRANCES_PASSWORD, so if you
// change the password in Vercel, every saved login stops working.
// (The underscore in the file name tells Vercel this is not a public endpoint.)

const crypto = require('crypto');

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function keyFrom(secret) {
  return crypto.createHash('sha256').update('frances-session:' + secret).digest();
}

function sign(expiry, secret) {
  return crypto.createHmac('sha256', keyFrom(secret)).update(String(expiry)).digest('hex');
}

function makeToken(secret) {
  const expiry = Date.now() + THIRTY_DAYS;
  return expiry + '.' + sign(expiry, secret);
}

function checkToken(token, secret) {
  if (typeof token !== 'string') return false;

  const [expiry, signature] = token.split('.');

  if (!expiry || !signature || !/^\d+$/.test(expiry)) return false;
  if (Number(expiry) < Date.now()) return false;

  const good = Buffer.from(sign(expiry, secret));
  const given = Buffer.from(signature);

  return good.length === given.length && crypto.timingSafeEqual(good, given);
}

module.exports = { makeToken, checkToken };
