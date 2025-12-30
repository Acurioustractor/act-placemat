/**
 * API Deprecation Middleware
 */

export function deprecated(options = {}) {
  const {
    version = '1.0.0',
    sunsetDate = '2025-01-27',
    replacement = null,
  } = options;

  return (req, res, next) => {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecated-Version', version);
    res.setHeader('X-API-Sunset-Date', sunsetDate);

    if (replacement) {
      res.setHeader('X-API-Replacement', replacement);
    }

    console.warn(\`⚠️ DEPRECATED: \${req.method} \${req.path} → \${replacement || '/api/v1/'}\`);
    next();
  };
}

export function deprecatedResponse(options = {}) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      return originalJson({
        ...data,
        _deprecated: {
          message: 'This endpoint is deprecated',
          sunsetDate: options.sunsetDate || '2025-01-27',
          replacement: options.replacement || '/api/v1/',
        },
      });
    };
    next();
  };
}
