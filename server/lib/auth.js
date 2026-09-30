function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  const encoded = header.slice(6);
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function createAuthMiddleware() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme';

  return function authMiddleware(req, res, next) {
    const credentials = parseBasicAuth(req.headers.authorization);

    if (credentials && credentials.username === username && credentials.password === password) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Pramana Baja Admin"');
    return res.status(401).json({ error: 'Login admin diperlukan.' });
  };
}

module.exports = {
  createAuthMiddleware,
};
