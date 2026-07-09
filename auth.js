const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const SECRET_FILE = path.join(__dirname, '.session-secret');

function getSessionSecret() {
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Chua dang nhap' });
}

module.exports = { getSessionSecret, requireAuth };
