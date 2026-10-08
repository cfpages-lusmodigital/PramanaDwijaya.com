function createAuthMiddleware() {
  return function authMiddleware(_req, _res, next) {
    return next();
  };
}

module.exports = {
  createAuthMiddleware,
};
