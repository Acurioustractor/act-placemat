import express from 'express';

const router = express.Router();

function buildOpenAPISpec(baseUrl = 'http://localhost:4000') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'ACT Platform API',
      version: '1.0.0',
      description: 'Consolidated API reference for ACT Platform'
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/health': { get: { summary: 'Platform health', responses: { '200': { description: 'OK' } } } },
      '/api/v1/platform/status': { get: { summary: 'Platform status', responses: { '200': { description: 'OK' } } } },
      '/api/v1/linkedin/status': { get: { summary: 'LinkedIn service status', responses: { '200': { description: 'OK' } } } },
      '/api/v1/financial/status': { get: { summary: 'Financial service status', responses: { '200': { description: 'OK' } } } },
      '/api/v1/data-intelligence/overview': { get: { summary: 'Data lake overview', responses: { '200': { description: 'OK' } } } },
      '/api/trpc/health': { get: { summary: 'tRPC health (via query)', responses: { '200': { description: 'OK' } } } }
    },
    tags: [
      { name: 'Platform' },
      { name: 'LinkedIn' },
      { name: 'Financial' },
      { name: 'Data Intelligence' }
    ]
  };
}

router.get('/', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json(buildOpenAPISpec(base));
});

export default router;
