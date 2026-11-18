import type { User } from 'firebase/auth';
import { computeInvoiceTotals } from './calculations';
import type {
  CatalogMaterial,
  InvoiceStatus,
  LineItemDraft,
  ProformaInvoiceDraft,
  SavedInvoiceRecord,
  StudioSettings,
} from '../types/proforma';

async function authFetch(
  user: User,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await user.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

export async function mongoLoadSettings(user: User): Promise<StudioSettings | null> {
  try {
    const res = await authFetch(user, '/api/mongo/settings');
    if (!res.ok) return null;
    const data = (await res.json()) as { settings?: StudioSettings | null };
    return data.settings ?? null;
  } catch {
    return null;
  }
}

export async function mongoSaveSettings(
  user: User,
  settings: StudioSettings
): Promise<boolean> {
  try {
    const res = await authFetch(user, '/api/mongo/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function mongoListInvoices(
  user: User
): Promise<SavedInvoiceRecord[] | null> {
  try {
    const res = await authFetch(user, '/api/mongo/invoices');
    if (!res.ok) return null;
    const data = (await res.json()) as { invoices?: SavedInvoiceRecord[] };
    return Array.isArray(data.invoices) ? data.invoices : [];
  } catch {
    return null;
  }
}

export async function mongoLoadInvoiceItems(
  user: User,
  invoiceId: string
): Promise<LineItemDraft[] | null> {
  try {
    const res = await authFetch(
      user,
      `/api/mongo/invoices/${encodeURIComponent(invoiceId)}/items`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: LineItemDraft[] };
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

export async function mongoSaveInvoice(
  user: User,
  invoice: ProformaInvoiceDraft,
  items: LineItemDraft[]
): Promise<boolean> {
  try {
    const summary = computeInvoiceTotals(invoice, items);
    const record: SavedInvoiceRecord = {
      ...invoice,
      discountValue: 0,
      subtotal: summary.subtotal,
      discountAmount: 0,
      taxAmount: summary.taxAmount,
      grandTotal: summary.grandTotal,
      itemCount: items.length,
    };
    const res = await authFetch(user, '/api/mongo/invoices', {
      method: 'POST',
      body: JSON.stringify({ record, items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function mongoUpdateInvoiceStatus(
  user: User,
  invoiceId: string,
  status: InvoiceStatus
): Promise<boolean> {
  try {
    const res = await authFetch(
      user,
      `/api/mongo/invoices/${encodeURIComponent(invoiceId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function mongoDeleteInvoice(
  user: User,
  invoiceId: string
): Promise<boolean> {
  try {
    const res = await authFetch(
      user,
      `/api/mongo/invoices/${encodeURIComponent(invoiceId)}`,
      {
        method: 'DELETE',
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function mongoSaveCatalogItem(
  user: User,
  item: CatalogMaterial
): Promise<boolean> {
  try {
    const res = await authFetch(user, '/api/mongo/catalog', {
      method: 'POST',
      body: JSON.stringify({ item }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function mongoDeleteCatalogItem(
  user: User,
  catalogId: string
): Promise<boolean> {
  try {
    const res = await authFetch(
      user,
      `/api/mongo/catalog/${encodeURIComponent(catalogId)}`,
      {
        method: 'DELETE',
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
