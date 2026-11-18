import { Router } from 'express';
import {
  PUBLIC_CATALOG_ITEMS,
  PUBLIC_STUDIO_PROFILE,
  type CatalogHint,
} from '../config/constants.ts';
import { requireAuthUid } from '../middleware/auth.ts';
import { checkMongoHealth, getMongoDb } from '../mongo.ts';
import { extractScopeWithAi } from '../services/geminiService.ts';

export const apiRouter = Router();

// --- Health & Diagnostic Endpoints ---
apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get('/mongo/status', async (_req, res) => {
  const status = await checkMongoHealth();
  res.status(status.connected ? 200 : 503).json(status);
});

// --- Public Studio & Catalog Endpoint ---
apiRouter.get('/public/catalog', async (req, res) => {
  const studioId = typeof req.query.studioId === 'string' ? req.query.studioId.trim() : '';
  if (studioId) {
    try {
      const db = await getMongoDb();
      const studioDoc = await db.collection('public_studios').findOne({ _id: studioId as never });
      const catDocs = await db
        .collection('public_catalog')
        .find({ ownerId: studioId })
        .sort({ title: 1 })
        .toArray();
      if (studioDoc || catDocs.length > 0) {
        res.json({
          studio: studioDoc ? { ...PUBLIC_STUDIO_PROFILE, ...studioDoc, _id: undefined } : PUBLIC_STUDIO_PROFILE,
          catalog:
            catDocs.length > 0
              ? catDocs.map(({ _id: _omit, ownerId: _owner, ...rest }) => rest)
              : PUBLIC_CATALOG_ITEMS,
        });
        return;
      }
    } catch {
      // Fall back cleanly to defaults when MongoDB is unreachable
    }
  }

  res.json({
    studio: PUBLIC_STUDIO_PROFILE,
    catalog: PUBLIC_CATALOG_ITEMS,
  });
});

// --- Authenticated MongoDB Studio Settings ---
apiRouter.get('/mongo/settings', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const db = await getMongoDb();
    const doc = await db.collection('studio_settings').findOne({ _id: uid as never });
    if (!doc) {
      res.json({ settings: null });
      return;
    }
    const { _id: _omit, ownerId: _owner, ...settings } = doc;
    res.json({ settings });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.post('/mongo/settings', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const { settings } = req.body as { settings?: Record<string, unknown> };
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload.' });
      return;
    }
    const db = await getMongoDb();
    const now = new Date().toISOString();
    const payload = { ...settings, ownerId: uid, updatedAt: now };
    await db
      .collection('studio_settings')
      .updateOne({ _id: uid as never }, { $set: payload }, { upsert: true });
    await db
      .collection('public_studios')
      .updateOne({ _id: uid as never }, { $set: payload }, { upsert: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

// --- Authenticated MongoDB Invoices ---
apiRouter.get('/mongo/invoices', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const db = await getMongoDb();
    const docs = await db
      .collection('invoices')
      .find({ ownerId: uid })
      .sort({ updatedAtMs: -1 })
      .toArray();
    res.json({
      invoices: docs.map(({ _id: _omit, items: _items, ownerId: _owner, ...record }) => record),
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.get('/mongo/invoices/:invoiceId/items', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const invoiceId = String(req.params.invoiceId || '').slice(0, 128);
    const db = await getMongoDb();
    const doc = await db.collection('invoices').findOne({ ownerId: uid, id: invoiceId });
    res.json({ items: Array.isArray(doc?.items) ? doc.items : [] });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.post('/mongo/invoices', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const { record, items } = req.body as {
      record?: Record<string, unknown>;
      items?: unknown[];
    };
    if (!record || typeof record !== 'object' || typeof record.id !== 'string') {
      res.status(400).json({ error: 'Invalid invoice payload.' });
      return;
    }
    const invoiceId = record.id.slice(0, 128);
    const db = await getMongoDb();
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    await db.collection('invoices').updateOne(
      { _id: `${uid}:${invoiceId}` as never },
      {
        $set: {
          ...record,
          id: invoiceId,
          ownerId: uid,
          items: Array.isArray(items) ? items : [],
          updatedAt: nowIso,
          updatedAtMs: nowMs,
        },
        $setOnInsert: {
          createdAt: nowIso,
        },
      },
      { upsert: true }
    );
    res.json({ ok: true, id: invoiceId });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.patch('/mongo/invoices/:invoiceId/status', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const invoiceId = String(req.params.invoiceId || '').slice(0, 128);
    const { status } = req.body as { status?: string };
    if (!status || !['draft', 'sent', 'approved', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Invalid invoice status.' });
      return;
    }
    const db = await getMongoDb();
    await db.collection('invoices').updateOne(
      { _id: `${uid}:${invoiceId}` as never, ownerId: uid },
      { $set: { status, updatedAt: new Date().toISOString(), updatedAtMs: Date.now() } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.delete('/mongo/invoices/:invoiceId', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const invoiceId = String(req.params.invoiceId || '').slice(0, 128);
    const db = await getMongoDb();
    await db.collection('invoices').deleteOne({ _id: `${uid}:${invoiceId}` as never, ownerId: uid });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

// --- Authenticated MongoDB Materials Catalog ---
apiRouter.get('/mongo/catalog', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const db = await getMongoDb();
    const docs = await db
      .collection('catalog')
      .find({ ownerId: uid })
      .sort({ title: 1 })
      .toArray();
    res.json({
      catalog: docs.map(({ _id: _omit, ownerId: _owner, ...item }) => item),
    });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.post('/mongo/catalog', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const { item } = req.body as { item?: Record<string, unknown> };
    if (!item || typeof item !== 'object' || typeof item.id !== 'string') {
      res.status(400).json({ error: 'Invalid catalog item.' });
      return;
    }
    const itemId = item.id.slice(0, 128);
    const db = await getMongoDb();
    const payload = { ...item, id: itemId, ownerId: uid, updatedAt: new Date().toISOString() };
    await db
      .collection('catalog')
      .updateOne({ _id: `${uid}:${itemId}` as never }, { $set: payload }, { upsert: true });
    await db
      .collection('public_catalog')
      .updateOne({ _id: `${uid}:${itemId}` as never }, { $set: payload }, { upsert: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

apiRouter.delete('/mongo/catalog/:catalogId', async (req, res) => {
  const uid = await requireAuthUid(req, res);
  if (!uid) return;
  try {
    const catalogId = String(req.params.catalogId || '').slice(0, 128);
    const db = await getMongoDb();
    const key = `${uid}:${catalogId}`;
    await db.collection('catalog').deleteOne({ _id: key as never, ownerId: uid });
    await db.collection('public_catalog').deleteOne({ _id: key as never, ownerId: uid });
    res.json({ ok: true });
  } catch (err) {
    res.status(503).json({
      error: err instanceof Error ? err.message : 'MongoDB unavailable',
    });
  }
});

// --- AI Scope Extraction ---
apiRouter.post('/ai/extract-scope', async (req, res) => {
  try {
    const { prompt, catalog, defaultCurrency } = req.body as {
      prompt?: string;
      catalog?: CatalogHint[];
      defaultCurrency?: string;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Please enter a client scope description to extract.' });
      return;
    }

    const result = await extractScopeWithAi({ prompt, catalog, defaultCurrency });
    res.json(result);
  } catch (error: unknown) {
    console.error('AI Scope Extraction Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'GEMINI_API_KEY_MISSING') {
      res.status(500).json({
        error: 'Gemini API key is not configured. Please check Settings > Secrets.',
      });
      return;
    }
    if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID') || message.includes('403')) {
      res.status(403).json({
        error: 'Gemini API key is invalid or unauthorized. Please verify it in Settings > Secrets.',
      });
      return;
    }
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
      res.status(429).json({
        error: 'Gemini API rate limit reached. Please retry in a moment or check your billing quota.',
      });
      return;
    }
    res.status(500).json({
      error: `Scope extraction failed: ${message}`,
    });
  }
});
