const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.uptime).toBeDefined();
  });
});

describe('GET /api', () => {
  it('should return service info', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('SalesFlow API');
    expect(res.body.version).toBe('0.1.0');
  });
});
