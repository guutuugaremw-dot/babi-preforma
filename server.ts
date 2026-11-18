import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { checkMongoHealth, getMongoDb } from './server/mongo.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseConfig: { projectId?: string } = { projectId: 'stable-hold-83rp2' };
try {
  const localConfig = path.resolve(__dirname, 'firebase-applet-config.json');
  const rootConfig = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const configPath = fs.existsSync(localConfig) ? localConfig : rootConfig;
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch {
  // Use default config
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAdminAuth(adminApp);

async function requireAuthUid(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Missing Authorization Bearer token.' });
    return null;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    return decoded.uid;
  } catch (err) {
    console.warn('ID token verification failed:', err instanceof Error ? err.message : String(err));
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
    return null;
  }
}

const PORT = 3000;

interface CatalogHint {
  title: string;
  specification?: string;
  pricingMode: 'dimension' | 'unit';
  unitLabel: string;
  unitPrice: number;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const PUBLIC_STUDIO_PROFILE = {
  brandName: 'BABI',
  tagline: 'INTERIOR DESIGN',
  location: 'Ambo City, Ethiopia',
  phone: '+251 91 985 4883',
  messagingNote: 'WhatsApp & Telegram Enabled',
  email: 'naolgaremew@gmail.com',
  bankLabel: 'Commercial Bank of Ethiopia (CBE)',
  bankAccount: '1000293847561',
  mobileMoneyLabel: 'Telebirr (Naol Geremaw)',
  mobileMoneyAccount: '0919854883',
  executionLocation: 'Ambo City & Regional Workshop',
  warrantyNote: 'Includes 5-Year Workshop Structural Warranty',
  footerNote: 'Thank you for choosing Babi Interior Design',
  defaultCurrency: 'ETB',
  defaultTaxRate: 0,
  defaultPrepaymentPercent: 50,
  invoicePrefix: 'PF',
};

const PUBLIC_CATALOG_ITEMS = [
  {
    id: 'cat_laminated_mdf',
    title: 'Laminated MDF',
    specification: 'Standard MDF Joinery',
    pricingMode: 'dimension' as const,
    defaultWidth: 3.0,
    defaultHeight: 2.4,
    unitLabel: 'm²',
    unitPrice: 17000,
  },
  {
    id: 'cat_uv_gloss_tv',
    title: 'Living Room Floating TV Unit',
    specification: 'UV High-Gloss / Super-Matte MDF',
    pricingMode: 'dimension' as const,
    defaultWidth: 3.6,
    defaultHeight: 2.25,
    unitLabel: 'm²',
    unitPrice: 22000,
  },
  {
    id: 'cat_full_wardrobe',
    title: 'Floor-to-Ceiling Sliding Wardrobe',
    specification: '18mm Turkish Melamine MDF + Aluminum Track',
    pricingMode: 'dimension' as const,
    defaultWidth: 2.8,
    defaultHeight: 2.7,
    unitLabel: 'm²',
    unitPrice: 19500,
  },
  {
    id: 'cat_kitchen_cabinet',
    title: 'Modular Kitchen Upper & Base Cabinetry',
    specification: 'Moisture-Resistant Marine MDF + Acrylic Fronts',
    pricingMode: 'dimension' as const,
    defaultWidth: 4.2,
    defaultHeight: 2.1,
    unitLabel: 'm²',
    unitPrice: 24500,
  },
  {
    id: 'cat_acoustic_slat',
    title: 'Acoustic Slatted Oak Feature Wall',
    specification: 'Natural Oak Veneer on Black Acoustic Felt',
    pricingMode: 'dimension' as const,
    defaultWidth: 3.2,
    defaultHeight: 2.6,
    unitLabel: 'm²',
    unitPrice: 15500,
  },
  {
    id: 'cat_nightstand',
    title: 'Floating Bedside Nightstand Pair',
    specification: 'Matte Lacquered MDF + Push-to-Open Drawer',
    pricingMode: 'unit' as const,
    defaultWidth: 0,
    defaultHeight: 0,
    unitLabel: 'pcs',
    unitPrice: 11500,
  },
];

export const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/mongo/status', async (_req, res) => {
    const status = await checkMongoHealth();
    res.status(status.connected ? 200 : 503).json(status);
  });

  app.get('/api/public/catalog', async (req, res) => {
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
        // Fall back cleanly to default catalog when MongoDB is unreachable
      }
    }

    res.json({
      studio: PUBLIC_STUDIO_PROFILE,
      catalog: PUBLIC_CATALOG_ITEMS,
    });
  });

  // --- Authenticated MongoDB Personal Workspace Routes ---
  app.get('/api/mongo/settings', async (req, res) => {
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

  app.post('/api/mongo/settings', async (req, res) => {
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

  app.get('/api/mongo/invoices', async (req, res) => {
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

  app.get('/api/mongo/invoices/:invoiceId/items', async (req, res) => {
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

  app.post('/api/mongo/invoices', async (req, res) => {
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

  app.patch('/api/mongo/invoices/:invoiceId/status', async (req, res) => {
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

  app.delete('/api/mongo/invoices/:invoiceId', async (req, res) => {
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

  app.get('/api/mongo/catalog', async (req, res) => {
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

  app.post('/api/mongo/catalog', async (req, res) => {
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

  app.delete('/api/mongo/catalog/:catalogId', async (req, res) => {
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

  app.post('/api/ai/extract-scope', async (req, res) => {
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

      const ai = getGeminiClient();
      const catalogContext =
        Array.isArray(catalog) && catalog.length > 0
          ? `Available Studio Material & Rate Catalog (prefer matching these unit prices if the client does not specify a custom price):\n${catalog
              .map(
                (c) =>
                  `- ${c.title} | Spec: ${c.specification || 'Standard'} | Mode: ${c.pricingMode} | Unit: ${c.unitLabel} | Rate: ${c.unitPrice} ${defaultCurrency || 'ETB'}`
              )
              .join('\n')}`
          : '';

      const systemInstruction = [
        'You are an expert interior design & custom joinery estimator.',
        'Parse unstructured client requests (emails, WhatsApp/Telegram messages, site notes) into structured pro forma invoice line items.',
        'Rules:',
        '1. If an item mentions dimensions like "3.54m x 3m" or "3.7 by 2.25 meters", set pricingMode to "dimension", extract width and height in meters, set unitLabel to "m²", and compute quantity as round(width * height * 100) / 100.',
        '2. If an item is counted by pieces, sets, or linear meters without WxH area, set pricingMode to "unit", set width and height to 0, and extract quantity and unitLabel (e.g., "pcs", "set", "m").',
        '3. Match unitPrice from the provided Studio Catalog when applicable, or use prices explicitly mentioned in the request. If neither specifies a price, provide a realistic estimate or 0.',
        '4. Extract add-ons/upgrades (such as LED lighting profiles, Blum soft-close hardware, mirror backing) into the addons array with estimated or stated prices.',
        '5. Extract clientName, clientPhone, clientAddress, projectTitle, and taxRate if mentioned in the text.',
        '6. Return clean, professional item titles and concise material specifications.',
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${catalogContext}\n\nClient Request:\n${prompt.trim()}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clientName: { type: Type.STRING, description: 'Client name if mentioned, otherwise empty string.' },
              clientPhone: { type: Type.STRING, description: 'Client phone number if mentioned, otherwise empty string.' },
              clientAddress: { type: Type.STRING, description: 'Client address or site location if mentioned.' },
              projectTitle: { type: Type.STRING, description: 'Concise project title summarizing the scope.' },
              taxRate: { type: Type.NUMBER, description: 'Tax/VAT percentage if mentioned (e.g. 15), otherwise -1 if unspecified.' },
              summaryNotes: { type: Type.STRING, description: 'Brief 1-sentence summary of assumptions made.' },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    specification: { type: Type.STRING },
                    pricingMode: { type: Type.STRING, description: '"dimension" or "unit"' },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    quantity: { type: Type.NUMBER },
                    unitLabel: { type: Type.STRING },
                    unitPrice: { type: Type.NUMBER },
                    addons: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          price: { type: Type.NUMBER },
                        },
                        required: ['name', 'price'],
                      },
                    },
                  },
                  required: [
                    'title',
                    'specification',
                    'pricingMode',
                    'width',
                    'height',
                    'quantity',
                    'unitLabel',
                    'unitPrice',
                    'addons',
                  ],
                },
              },
            },
            required: ['clientName', 'clientPhone', 'projectTitle', 'items', 'summaryNotes'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      res.json(parsed);
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

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Babi Studio Pro Forma server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
