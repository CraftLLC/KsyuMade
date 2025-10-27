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

adminApp.post('/images/order', async (c) => {
  try {
    const { order } = await c.req.json();

    const pathnames = order.map(url => {
      try {
        const urlObject = new URL(url);
        return urlObject.pathname.substring(1);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const { blobs } = await list({
      prefix: 'gallery-order.json',
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    await Promise.all(blobs.map(blob => del(blob.url, { token: c.env.VERCEL_BLOB_TOKEN })));

    await put('gallery-order.json', JSON.stringify(pathnames), {
      access: 'public',
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
    const orderBlob = blobs.find(blob => blob.pathname === 'gallery-order.json');

    let orderedUrls = [];
    if (orderBlob) {
      const orderResponse = await fetch(orderBlob.url);
      const order = await orderResponse.json();
      orderedUrls = order.map(filename => imageBlobs.find(b => b.pathname === filename)?.url).filter(Boolean);
      const unorderedUrls = imageBlobs.filter(b => !order.includes(b.pathname)).map(b => b.url);
      orderedUrls.push(...unorderedUrls);
    } else {
      orderedUrls = imageBlobs.map(b => b.url);
    }

    return c.json(orderedUrls);
  } catch (error) {
    return handleError(error, c);
  }
});

app.get('/api/debug', async (c) => {
  try {
    const { blobs } = await list({
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    const orderBlob = blobs.find(blob => blob.pathname === 'gallery-order.json');

    let order = null;
    if (orderBlob) {
      const orderResponse = await fetch(orderBlob.url);
      order = await orderResponse.json();
    }

    return c.json({
      blobs,
      orderBlob,
      order
    });
  } catch (error) {
    return handleError(error, c);
  }
});

app.get('/api/images/debug', async (c) => {
  try {
    const { blobs } = await list({
      token: c.env.VERCEL_BLOB_TOKEN,
    });

    const imageBlobs = blobs.filter(blob => blob.pathname !== 'gallery-order.json');
    const orderBlob = blobs.find(blob => blob.pathname === 'gallery-order.json');

    let orderedUrls = [];
    let order = null;
    if (orderBlob) {
      const orderResponse = await fetch(orderBlob.url);
      order = await orderResponse.json();
      orderedUrls = order.map(filename => imageBlobs.find(b => b.pathname === filename)?.url).filter(Boolean);
      const unorderedUrls = imageBlobs.filter(b => !order.includes(b.pathname)).map(b => b.url);
      orderedUrls.push(...unorderedUrls);
    } else {
      orderedUrls = imageBlobs.map(b => b.url);
    }

    return c.json({
      orderedUrls,
      order,
      imageBlobs
    });
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
