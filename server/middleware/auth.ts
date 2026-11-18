import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

let firebaseConfig: { projectId?: string } = { projectId: 'stable-hold-83rp2' };

try {
  const localConfig = path.resolve(import.meta.dirname, '../../firebase-applet-config.json');
  const rootConfig = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const configPath = fs.existsSync(localConfig) ? localConfig : rootConfig;
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch {
  // Use fallback configuration
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });

export const adminAuth = getAdminAuth(adminApp);

export async function requireAuthUid(req: Request, res: Response): Promise<string | null> {
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
