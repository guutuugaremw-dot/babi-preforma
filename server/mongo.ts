import dns from 'dns';
import { MongoClient, type Db } from 'mongodb';

// Ensure SRV records can be resolved reliably on Windows/local DNS environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS server configuration is not permitted
}

const DB_NAME = 'babi_proforma';

let clientPromise: Promise<MongoClient> | null = null;
let lastMongoError: string | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0);
}

export async function getMongoDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
      family: 4,
    });
    clientPromise = client.connect().catch((err) => {
      clientPromise = null;
      lastMongoError = err instanceof Error ? err.message : String(err);
      throw err;
    });
  }

  const connectedClient = await clientPromise;
  lastMongoError = null;
  return connectedClient.db(DB_NAME);
}

export async function checkMongoHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  database: string;
  error?: string;
}> {
  if (!isMongoConfigured()) {
    return {
      configured: false,
      connected: false,
      database: DB_NAME,
      error: 'MONGODB_URI is not set.',
    };
  }

  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    return {
      configured: true,
      connected: true,
      database: DB_NAME,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    lastMongoError = msg;
    return {
      configured: true,
      connected: false,
      database: DB_NAME,
      error: msg,
    };
  }
}

export function getLastMongoError(): string | null {
  return lastMongoError;
}
