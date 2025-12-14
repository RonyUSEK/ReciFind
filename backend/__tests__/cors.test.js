const request = require('supertest');
const app = require('../index');

describe('CORS preflight', () => {
  test('OPTIONS includes PATCH in Access-Control-Allow-Methods', async () => {
    const res = await request(app)
      .options('/api/collections/1')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'PATCH')
      .expect((r) => {
        // cors package can return this header in different cases; supertest normalizes to lower-case keys
        const allow = r.headers['access-control-allow-methods'];
        if (!allow) throw new Error('Missing access-control-allow-methods');
        if (!String(allow).toUpperCase().includes('PATCH')) {
          throw new Error(`PATCH not allowed in access-control-allow-methods: ${allow}`);
        }
      });

    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });
});
