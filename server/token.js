// jose rather than jsonwebtoken: jsonwebtoken's dependency chain ends in
// buffer-equal-constant-time, which touches SlowBuffer on load and so
// crashes the server on Node 26, where SlowBuffer no longer exists.
const { SignJWT, jwtVerify } = require('jose');

const ALGORITHM = 'HS256';
const LIFETIME = '24h';

function keyFrom(secret) {
  // jsonwebtoken refused to sign without a secret; an empty HMAC key would
  // quietly produce tokens anyone can forge, so keep refusing
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(secret);
}

/** Signs a token carrying `payload`, valid for a day. */
async function signToken(payload, secret) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(LIFETIME)
    .sign(keyFrom(secret));
}

/** Resolves to the token's payload, or rejects if it is forged or expired. */
async function verifyToken(token, secret) {
  const { payload } = await jwtVerify(token, keyFrom(secret), {
    algorithms: [ALGORITHM]
  });
  return payload;
}

module.exports = { signToken, verifyToken };
