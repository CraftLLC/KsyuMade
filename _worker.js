import { Hono } from 'hono';
import { list, put, del } from '@vercel/blob';
import { SignJWT } from 'jose';
import { jwt } from 'hono/jwt';

const app = new Hono().basePath('/');
const adminApp = new Hono();

const handleError = (error, c) => {
  console.error('An error occurred:', error.message);
  return c.json({ error: 'Internal Server Error', details: error.message }, 500);
};

// Protected admin routes
adminApp.use('*', async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
  });
  return jwtMiddleware(c, next);
});

adminApp.post('/images', async (c) => {
  try {
    const { file } = await c.req.parseBody();
    if (!file) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'Only images are allowed.' }, 400);
    }

    if (file.name === 'gallery-order.json') {
      return c.json({ error: 'This filename is not allowed.' }, 400);
    }

    const { url } = await put(file.name, file, {
      access: 'public',
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    return c.json({ url });
  } catch (error) {
    return handleError(error, c);
  }
});

adminApp.delete('/images/:filename', async (c) => {
  try {
    const { filename } = c.req.param();
    await del(`${filename}`, {
      token: c.env.VERCEL_BLOB_TOKEN,
    });
    return c.json({ success: true });
  } catch (error) {
    return handleError(error, c);
  }
});

app.route('/api/admin', adminApp);

// Public routes
app.get('/api/images', async (c) => {
  try {
    if (!c.env.VERCEL_BLOB_TOKEN) {
      return c.json({ error: 'VERCEL_BLOB_TOKEN is not configured.' }, 500);
    }

    const { blobs } = await list({
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    const imageBlobs = blobs.filter(blob => blob.pathname !== 'gallery-order.json');

    return c.json(imageBlobs.map(b => b.url));
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
