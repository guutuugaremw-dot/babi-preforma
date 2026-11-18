import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  CatalogMaterial,
  InvoiceStatus,
  LineItemDraft,
  ProformaInvoiceDraft,
  SavedInvoiceRecord,
  StudioSettings,
} from '../types/proforma';
import { computeInvoiceTotals, computeLineCalculation, generateSafeId } from './calculations';
import { db, handleFirestoreError, OperationType } from './firebase';

function clampString(value: string | undefined, max: number): string {
  return (value ?? '').trim().slice(0, max);
}

function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || generateSafeId('doc');
}

function sanitizeRefNumber(ref: string): string {
  const cleaned = ref
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
  return cleaned.length >= 3 ? cleaned : 'PF-2026-0001';
}

function sanitizePrefix(prefix: string): string {
  const cleaned = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16);
  return cleaned.length >= 1 ? cleaned : 'PF';
}

export async function loadStudioSettings(uid: string): Promise<StudioSettings | null> {
  const path = `users/${uid}/settings/studio`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'settings', 'studio'));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      brandName: String(d.brandName || 'BABI'),
      tagline: String(d.tagline ?? ''),
      location: String(d.location ?? ''),
      phone: String(d.phone ?? ''),
      messagingNote: String(d.messagingNote ?? ''),
      email: String(d.email ?? ''),
      bankLabel: String(d.bankLabel ?? ''),
      bankAccount: String(d.bankAccount ?? ''),
      mobileMoneyLabel: String(d.mobileMoneyLabel ?? ''),
      mobileMoneyAccount: String(d.mobileMoneyAccount ?? ''),
      executionLocation: String(d.executionLocation ?? ''),
      warrantyNote: String(d.warrantyNote ?? ''),
      footerNote: String(d.footerNote ?? ''),
      defaultCurrency: d.defaultCurrency || 'ETB',
      defaultTaxRate: Number(d.defaultTaxRate ?? 0),
      defaultPrepaymentPercent: Number(d.defaultPrepaymentPercent ?? 50),
      invoicePrefix: String(d.invoicePrefix || 'PF'),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveStudioSettings(uid: string, settings: StudioSettings): Promise<void> {
  const path = `users/${uid}/settings/studio`;
  try {
    const payload = {
      ownerId: uid,
      brandName: clampString(settings.brandName, 100) || 'Studio',
      tagline: clampString(settings.tagline, 120),
      location: clampString(settings.location, 160),
      phone: clampString(settings.phone, 40),
      messagingNote: clampString(settings.messagingNote, 80),
      email: clampString(settings.email, 120),
      bankLabel: clampString(settings.bankLabel, 120),
      bankAccount: clampString(settings.bankAccount, 80),
      mobileMoneyLabel: clampString(settings.mobileMoneyLabel, 80),
      mobileMoneyAccount: clampString(settings.mobileMoneyAccount, 120),
      executionLocation: clampString(settings.executionLocation, 160),
      warrantyNote: clampString(settings.warrantyNote, 200),
      footerNote: clampString(settings.footerNote, 200),
      defaultCurrency: settings.defaultCurrency,
      defaultTaxRate: Math.min(100, Math.max(0, Number(settings.defaultTaxRate) || 0)),
      defaultPrepaymentPercent: Math.min(100, Math.max(0, Number(settings.defaultPrepaymentPercent) || 0)),
      invoicePrefix: sanitizePrefix(settings.invoicePrefix),
      updatedAt: serverTimestamp(),
    };

    const ref = doc(db, 'users', uid, 'settings', 'studio');
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        brandName: payload.brandName,
        tagline: payload.tagline,
        location: payload.location,
        phone: payload.phone,
        messagingNote: payload.messagingNote,
        email: payload.email,
        bankLabel: payload.bankLabel,
        bankAccount: payload.bankAccount,
        mobileMoneyLabel: payload.mobileMoneyLabel,
        mobileMoneyAccount: payload.mobileMoneyAccount,
        executionLocation: payload.executionLocation,
        warrantyNote: payload.warrantyNote,
        footerNote: payload.footerNote,
        defaultCurrency: payload.defaultCurrency,
        defaultTaxRate: payload.defaultTaxRate,
        defaultPrepaymentPercent: payload.defaultPrepaymentPercent,
        invoicePrefix: payload.invoicePrefix,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserInvoices(
  uid: string,
  onData: (invoices: SavedInvoiceRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/invoices`;
  const q = query(
    collection(db, 'users', uid, 'invoices'),
    where('ownerId', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: SavedInvoiceRecord[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            referenceNumber: String(d.referenceNumber || ''),
            status: (d.status || 'draft') as InvoiceStatus,
            issueDate: String(d.issueDate || ''),
            validUntil: String(d.validUntil || ''),
            clientName: String(d.clientName || ''),
            clientPhone: String(d.clientPhone ?? ''),
            clientAddress: String(d.clientAddress ?? ''),
            projectTitle: String(d.projectTitle ?? ''),
            currency: d.currency || 'ETB',
            discountType: d.discountType || 'percent',
            discountValue: Number(d.discountValue ?? 0),
            taxRate: Number(d.taxRate ?? 0),
            prepaymentPercent: Number(d.prepaymentPercent ?? 50),
            paymentTerms: String(d.paymentTerms ?? ''),
            subtotal: Number(d.subtotal ?? 0),
            discountAmount: Number(d.discountAmount ?? 0),
            taxAmount: Number(d.taxAmount ?? 0),
            grandTotal: Number(d.grandTotal ?? 0),
            itemCount: Number(d.itemCount ?? 0),
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        })
        .sort((a, b) => {
          const toMs = (val: unknown): number => {
            if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
              return (val as { toMillis: () => number }).toMillis();
            }
            return 0;
          };
          return toMs(b.updatedAt) - toMs(a.updatedAt);
        });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function loadInvoiceItems(uid: string, invoiceId: string): Promise<LineItemDraft[]> {
  const safeInvId = sanitizeId(invoiceId);
  const path = `users/${uid}/invoices/${safeInvId}/items`;
  try {
    const q = query(
      collection(db, 'users', uid, 'invoices', safeInvId, 'items'),
      where('ownerId', '==', uid),
      where('invoiceId', '==', safeInvId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        const addonNames: string[] = Array.isArray(d.addonNames) ? d.addonNames : [];
        const addonPrices: number[] = Array.isArray(d.addonPrices) ? d.addonPrices : [];
        return {
          id: docSnap.id,
          sortOrder: Number(d.sortOrder ?? 0),
          title: String(d.title || 'Item'),
          specification: String(d.specification ?? ''),
          pricingMode: d.pricingMode === 'unit' ? ('unit' as const) : ('dimension' as const),
          width: Number(d.width ?? 0),
          height: Number(d.height ?? 0),
          quantity: Number(d.quantity ?? 0),
          unitLabel: String(d.unitLabel || 'm²'),
          unitPrice: Number(d.unitPrice ?? 0),
          addons: addonNames.map((name, idx) => ({
            id: generateSafeId('addon'),
            name: String(name),
            price: Number(addonPrices[idx] ?? 0),
          })),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveInvoiceWithItems(
  uid: string,
  invoice: ProformaInvoiceDraft,
  items: LineItemDraft[]
): Promise<string> {
  const invoiceId = sanitizeId(invoice.id);
  const invoicePath = `users/${uid}/invoices/${invoiceId}`;
  const summary = computeInvoiceTotals(invoice, items);

  try {
    const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
    const existingSnap = await getDoc(invRef);

    if (existingSnap.exists()) {
      const prevStatus = existingSnap.data().status;
      if (prevStatus === 'archived') {
        throw new Error('Archived invoices cannot be modified. Restore to Draft first.');
      }
      await updateDoc(invRef, {
        referenceNumber: sanitizeRefNumber(invoice.referenceNumber),
        status: invoice.status,
        issueDate: clampString(invoice.issueDate, 32) || new Date().toISOString().slice(0, 10),
        validUntil: clampString(invoice.validUntil, 32) || new Date().toISOString().slice(0, 10),
        clientName: clampString(invoice.clientName, 120) || 'Unnamed Client',
        clientPhone: clampString(invoice.clientPhone, 40),
        clientAddress: clampString(invoice.clientAddress, 200),
        projectTitle: clampString(invoice.projectTitle, 160),
        currency: invoice.currency,
        discountType: invoice.discountType,
        discountValue: Math.max(0, Number(invoice.discountValue) || 0),
        taxRate: Math.min(100, Math.max(0, Number(invoice.taxRate) || 0)),
        prepaymentPercent: Math.min(100, Math.max(0, Number(invoice.prepaymentPercent) || 0)),
        paymentTerms: clampString(invoice.paymentTerms, 1000),
        subtotal: summary.subtotal,
        discountAmount: summary.discountAmount,
        taxAmount: summary.taxAmount,
        grandTotal: summary.grandTotal,
        itemCount: items.length,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(invRef, {
        ownerId: uid,
        referenceNumber: sanitizeRefNumber(invoice.referenceNumber),
        status: invoice.status,
        issueDate: clampString(invoice.issueDate, 32) || new Date().toISOString().slice(0, 10),
        validUntil: clampString(invoice.validUntil, 32) || new Date().toISOString().slice(0, 10),
        clientName: clampString(invoice.clientName, 120) || 'Unnamed Client',
        clientPhone: clampString(invoice.clientPhone, 40),
        clientAddress: clampString(invoice.clientAddress, 200),
        projectTitle: clampString(invoice.projectTitle, 160),
        currency: invoice.currency,
        discountType: invoice.discountType,
        discountValue: Math.max(0, Number(invoice.discountValue) || 0),
        taxRate: Math.min(100, Math.max(0, Number(invoice.taxRate) || 0)),
        prepaymentPercent: Math.min(100, Math.max(0, Number(invoice.prepaymentPercent) || 0)),
        paymentTerms: clampString(invoice.paymentTerms, 1000),
        subtotal: summary.subtotal,
        discountAmount: summary.discountAmount,
        taxAmount: summary.taxAmount,
        grandTotal: summary.grandTotal,
        itemCount: items.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Sync items subcollection (remove stale items, upsert current items)
    const itemsCol = collection(db, 'users', uid, 'invoices', invoiceId, 'items');
    const existingItemsSnap = await getDocs(
      query(itemsCol, where('ownerId', '==', uid), where('invoiceId', '==', invoiceId))
    );
    const existingIds = new Set(existingItemsSnap.docs.map((d) => d.id));
    const desiredIds = new Set(items.map((item) => sanitizeId(item.id)));

    const batch = writeBatch(db);
    existingItemsSnap.docs.forEach((docSnap) => {
      if (!desiredIds.has(docSnap.id)) {
        batch.delete(docSnap.ref);
      }
    });

    items.forEach((item, index) => {
      const itemId = sanitizeId(item.id);
      const calc = computeLineCalculation(item);
      const boundedAddons = (item.addons || []).slice(0, 10);
      const addonNames = boundedAddons.map((a) => clampString(a.name, 120) || 'Upgrade');
      const addonPrices = boundedAddons.map((a) => Math.max(0, Number(a.price) || 0));

      const itemRef = doc(db, 'users', uid, 'invoices', invoiceId, 'items', itemId);
      if (existingIds.has(itemId)) {
        batch.update(itemRef, {
          sortOrder: index,
          title: clampString(item.title, 160) || 'Custom Item',
          specification: clampString(item.specification, 160),
          pricingMode: item.pricingMode,
          width: Math.max(0, Number(item.width) || 0),
          height: Math.max(0, Number(item.height) || 0),
          quantity: calc.effectiveQuantity,
          unitLabel: clampString(item.unitLabel, 24) || 'm²',
          unitPrice: Math.max(0, Number(item.unitPrice) || 0),
          addonNames,
          addonPrices,
          addonsTotal: calc.addonsTotal,
          lineTotal: calc.lineTotal,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(itemRef, {
          ownerId: uid,
          invoiceId,
          sortOrder: index,
          title: clampString(item.title, 160) || 'Custom Item',
          specification: clampString(item.specification, 160),
          pricingMode: item.pricingMode,
          width: Math.max(0, Number(item.width) || 0),
          height: Math.max(0, Number(item.height) || 0),
          quantity: calc.effectiveQuantity,
          unitLabel: clampString(item.unitLabel, 24) || 'm²',
          unitPrice: Math.max(0, Number(item.unitPrice) || 0),
          addonNames,
          addonPrices,
          addonsTotal: calc.addonsTotal,
          lineTotal: calc.lineTotal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    await batch.commit();
    return invoiceId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, invoicePath);
  }
}

export async function updateInvoiceStatus(
  uid: string,
  invoiceId: string,
  nextStatus: InvoiceStatus
): Promise<void> {
  const safeId = sanitizeId(invoiceId);
  const path = `users/${uid}/invoices/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'invoices', safeId), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSavedInvoice(uid: string, invoiceId: string): Promise<void> {
  const safeId = sanitizeId(invoiceId);
  const path = `users/${uid}/invoices/${safeId}`;
  try {
    const itemsCol = collection(db, 'users', uid, 'invoices', safeId, 'items');
    const itemsSnap = await getDocs(
      query(itemsCol, where('ownerId', '==', uid), where('invoiceId', '==', safeId))
    );
    const invSnap = await getDoc(doc(db, 'users', uid, 'invoices', safeId));
    const isArchived = invSnap.exists() && invSnap.data().status === 'archived';
    if (isArchived && itemsSnap.docs.length > 0) {
      await updateDoc(doc(db, 'users', uid, 'invoices', safeId), {
        status: 'draft',
        updatedAt: serverTimestamp(),
      });
    }
    const batch = writeBatch(db);
    itemsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'users', uid, 'invoices', safeId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeCatalogMaterials(
  uid: string,
  onData: (items: CatalogMaterial[]) => void
): Unsubscribe {
  const path = `users/${uid}/catalog`;
  const q = query(
    collection(db, 'users', uid, 'catalog'),
    where('ownerId', '==', uid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CatalogMaterial[] = snapshot.docs
        .map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: String(d.title || ''),
            specification: String(d.specification ?? ''),
            pricingMode: d.pricingMode === 'unit' ? ('unit' as const) : ('dimension' as const),
            defaultWidth: Number(d.defaultWidth ?? 0),
            defaultHeight: Number(d.defaultHeight ?? 0),
            unitLabel: String(d.unitLabel || 'm²'),
            unitPrice: Number(d.unitPrice ?? 0),
          };
        })
        .sort((a, b) => a.title.localeCompare(b.title));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCatalogMaterial(uid: string, item: CatalogMaterial): Promise<void> {
  const itemId = sanitizeId(item.id);
  const path = `users/${uid}/catalog/${itemId}`;
  try {
    const ref = doc(db, 'users', uid, 'catalog', itemId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        title: clampString(item.title, 160) || 'Material',
        specification: clampString(item.specification, 160),
        pricingMode: item.pricingMode,
        defaultWidth: Math.max(0, Number(item.defaultWidth) || 0),
        defaultHeight: Math.max(0, Number(item.defaultHeight) || 0),
        unitLabel: clampString(item.unitLabel, 24) || 'm²',
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        title: clampString(item.title, 160) || 'Material',
        specification: clampString(item.specification, 160),
        pricingMode: item.pricingMode,
        defaultWidth: Math.max(0, Number(item.defaultWidth) || 0),
        defaultHeight: Math.max(0, Number(item.defaultHeight) || 0),
        unitLabel: clampString(item.unitLabel, 24) || 'm²',
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCatalogMaterial(uid: string, catalogId: string): Promise<void> {
  const safeId = sanitizeId(catalogId);
  const path = `users/${uid}/catalog/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'catalog', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function publishPublicStudioProfile(
  uid: string,
  settings: StudioSettings
): Promise<void> {
  const path = `public_studios/${uid}`;
  try {
    const ref = doc(db, 'public_studios', uid);
    const payload = {
      ownerId: uid,
      brandName: clampString(settings.brandName, 100) || 'BABI',
      tagline: clampString(settings.tagline, 120),
      location: clampString(settings.location, 160),
      phone: clampString(settings.phone, 40),
      messagingNote: clampString(settings.messagingNote, 80),
      email: clampString(settings.email, 120),
      bankLabel: clampString(settings.bankLabel, 120),
      bankAccount: clampString(settings.bankAccount, 80),
      mobileMoneyLabel: clampString(settings.mobileMoneyLabel, 80),
      mobileMoneyAccount: clampString(settings.mobileMoneyAccount, 120),
      executionLocation: clampString(settings.executionLocation, 160),
      warrantyNote: clampString(settings.warrantyNote, 200),
      footerNote: clampString(settings.footerNote, 200),
      defaultCurrency: settings.defaultCurrency,
      defaultTaxRate: Math.min(100, Math.max(0, Number(settings.defaultTaxRate) || 0)),
      defaultPrepaymentPercent: Math.min(
        100,
        Math.max(0, Number(settings.defaultPrepaymentPercent) || 0)
      ),
      invoicePrefix: sanitizePrefix(settings.invoicePrefix),
      updatedAt: serverTimestamp(),
    };
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, {
        brandName: payload.brandName,
        tagline: payload.tagline,
        location: payload.location,
        phone: payload.phone,
        messagingNote: payload.messagingNote,
        email: payload.email,
        bankLabel: payload.bankLabel,
        bankAccount: payload.bankAccount,
        mobileMoneyLabel: payload.mobileMoneyLabel,
        mobileMoneyAccount: payload.mobileMoneyAccount,
        executionLocation: payload.executionLocation,
        warrantyNote: payload.warrantyNote,
        footerNote: payload.footerNote,
        defaultCurrency: payload.defaultCurrency,
        defaultTaxRate: payload.defaultTaxRate,
        defaultPrepaymentPercent: payload.defaultPrepaymentPercent,
        invoicePrefix: payload.invoicePrefix,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function publishPublicCatalogMaterial(
  uid: string,
  item: CatalogMaterial
): Promise<void> {
  const itemId = sanitizeId(item.id);
  const path = `public_studios/${uid}/catalog/${itemId}`;
  try {
    const ref = doc(db, 'public_studios', uid, 'catalog', itemId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, {
        title: clampString(item.title, 160) || 'Material',
        specification: clampString(item.specification, 160),
        pricingMode: item.pricingMode,
        defaultWidth: Math.max(0, Number(item.defaultWidth) || 0),
        defaultHeight: Math.max(0, Number(item.defaultHeight) || 0),
        unitLabel: clampString(item.unitLabel, 24) || 'm²',
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: uid,
        title: clampString(item.title, 160) || 'Material',
        specification: clampString(item.specification, 160),
        pricingMode: item.pricingMode,
        defaultWidth: Math.max(0, Number(item.defaultWidth) || 0),
        defaultHeight: Math.max(0, Number(item.defaultHeight) || 0),
        unitLabel: clampString(item.unitLabel, 24) || 'm²',
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePublicCatalogMaterial(
  uid: string,
  catalogId: string
): Promise<void> {
  const safeId = sanitizeId(catalogId);
  const path = `public_studios/${uid}/catalog/${safeId}`;
  try {
    await deleteDoc(doc(db, 'public_studios', uid, 'catalog', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function loadPublicStudioPortal(studioId: string): Promise<{
  studio: StudioSettings | null;
  catalog: CatalogMaterial[];
}> {
  const safeStudioId = sanitizeId(studioId);
  const studioPath = `public_studios/${safeStudioId}`;
  const catalogPath = `public_studios/${safeStudioId}/catalog`;

  try {
    const studioSnap = await getDoc(doc(db, 'public_studios', safeStudioId));
    let studio: StudioSettings | null = null;
    if (studioSnap.exists()) {
      const d = studioSnap.data();
      studio = {
        brandName: String(d.brandName || 'BABI'),
        tagline: String(d.tagline ?? ''),
        location: String(d.location ?? ''),
        phone: String(d.phone ?? ''),
        messagingNote: String(d.messagingNote ?? ''),
        email: String(d.email ?? ''),
        bankLabel: String(d.bankLabel ?? ''),
        bankAccount: String(d.bankAccount ?? ''),
        mobileMoneyLabel: String(d.mobileMoneyLabel ?? ''),
        mobileMoneyAccount: String(d.mobileMoneyAccount ?? ''),
        executionLocation: String(d.executionLocation ?? ''),
        warrantyNote: String(d.warrantyNote ?? ''),
        footerNote: String(d.footerNote ?? ''),
        defaultCurrency: d.defaultCurrency || 'ETB',
        defaultTaxRate: Number(d.defaultTaxRate ?? 0),
        defaultPrepaymentPercent: Number(d.defaultPrepaymentPercent ?? 50),
        invoicePrefix: String(d.invoicePrefix || 'PF'),
      };
    }

    const catSnap = await getDocs(
      query(
        collection(db, 'public_studios', safeStudioId, 'catalog'),
        where('ownerId', '==', safeStudioId)
      )
    );
    const catalog: CatalogMaterial[] = catSnap.docs
      .map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: String(d.title || ''),
          specification: String(d.specification ?? ''),
          pricingMode: d.pricingMode === 'unit' ? ('unit' as const) : ('dimension' as const),
          defaultWidth: Number(d.defaultWidth ?? 0),
          defaultHeight: Number(d.defaultHeight ?? 0),
          unitLabel: String(d.unitLabel || 'm²'),
          unitPrice: Number(d.unitPrice ?? 0),
        };
      })
      .sort((a, b) => a.title.localeCompare(b.title));

    return { studio, catalog };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${studioPath} / ${catalogPath}`);
  }
}
