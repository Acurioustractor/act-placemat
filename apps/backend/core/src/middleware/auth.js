export const optionalAuth = (_req, _res, next) => next();
export const authenticate = optionalAuth;
export const requireAuth = optionalAuth;
export const apiKeyOrAuth = optionalAuth;
export const extractUser = (req, _res, next) => { req.user = req.user || null; next(); };
export const generateToken = () => null;

export default {
  optionalAuth,
  authenticate,
  requireAuth,
  apiKeyOrAuth,
  extractUser,
  generateToken
};
