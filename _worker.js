import { Hono } from 'hono';
import { list } from '@vercel/blob';
import { SignJWT } from 'jose';

const app = new Hono().basePath('/');

const handleError = (error, c) => {
  console.error('An error occurred:', error.message);
  return c.json({ error: 'Internal Server Error', details: error.message }, 500);
};

app.get('/api/images', async (c) => {
  try {
    if (!c.env.VERCEL_BLOB_TOKEN) {
      return c.json({ error: 'VERCEL_BLOB_TOKEN is not configured.' }, 500);
    }

    const { blobs } = await list({
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    const sortedBlobs = blobs.sort((a, b) => {
      const numA = parseInt(a.pathname.match(/^(\d+)/)?.[1] || '0', 10);
      const numB = parseInt(b.pathname.match(/^(\d+)/)?.[1] || '0', 10);
      return numA - numB;
    });

    const urls = sortedBlobs.map(blob => blob.url);

    return c.json(urls);
  } catch (error) {
    return handleError(error, c);
  }
});

app.post('/api/login', async (c) => {
  try {
    const { login, password } = await c.req.json();

    if (login !== c.env.ADMIN_LOGIN || password !== c.env.ADMIN_PASSWORD) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const alg = 'HS256';

    const jwt = await new SignJWT({ 'https://ksyumade.com/admin': true })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setIssuer('urn:ksyumade:issuer')
      .setAudience('urn:ksyumade:audience')
      .setExpirationTime('24h')
      .sign(secret);

    return c.json({ token: jwt });

  } catch (error) {
    return handleError(error, c);
  }
});

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};