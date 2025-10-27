import { Hono } from 'hono';
import { list } from '@vercel/blob';
import { SignJWT } from 'jose';

// The Hono app is exported by default. Cloudflare Pages will use it to handle requests.
const app = new Hono().basePath('/');

/**
 * Handles errors gracefully and returns a JSON response.
 * @param {Error} error - The error object.
 * @param {import('hono').Context} c - The Hono context.
 * @returns {Response}
 */
const handleError = (error, c) => {
  console.error('An error occurred:', error.message);
  return c.json({ error: 'Internal Server Error', details: error.message }, 500);
};

// Public endpoint to get all gallery images, sorted numerically
app.get('/api/images', async (c) => {
  try {
    if (!c.env.VERCEL_BLOB_TOKEN) {
      return c.json({ error: 'VERCEL_BLOB_TOKEN is not configured.' }, 500);
    }

    const { blobs } = await list({
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    // Sort blobs numerically based on their pathname (e.g., 1.jpg, 2.jpg, 10.jpg)
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

// Login endpoint
app.post('/api/login', async (c) => {
  try {
    const { login, password } = await c.req.json();

    // Verify credentials against environment variables (secrets)
    if (login !== c.env.ADMIN_LOGIN || password !== c.env.ADMIN_PASSWORD) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Create a JWT
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const alg = 'HS256';

    const jwt = await new SignJWT({ 'https://ksyumade.com/admin': true })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setIssuer('urn:ksyumade:issuer')
      .setAudience('urn:ksyumade:audience')
      .setExpirationTime('24h') // Token expires in 24 hours
      .sign(secret);

    return c.json({ token: jwt });

  } catch (error) {
    return handleError(error, c);
  }
});

export default app;
