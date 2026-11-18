import type {
  CalculatedLineItem,
  CurrencyCode,
  InvoiceCalculationSummary,
  LineItemDraft,
  ProformaInvoiceDraft,
} from '../types/proforma';

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeEffectiveQuantity(item: LineItemDraft): number {
  if (item.pricingMode === 'dimension') {
    const w = Math.max(0, Number(item.width) || 0);
    const h = Math.max(0, Number(item.height) || 0);
    return round2(w * h);
  }
  return round2(Math.max(0, Number(item.quantity) || 0));
}

export function computeLineCalculation(item: LineItemDraft): CalculatedLineItem {
  const effectiveQuantity = computeEffectiveQuantity(item);
  const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
  const baseAmount = round2(effectiveQuantity * unitPrice);
  const addonsTotal = round2(
    (item.addons || []).reduce((acc, addon) => acc + Math.max(0, Number(addon.price) || 0), 0)
  );
  const lineTotal = round2(baseAmount + addonsTotal);

  return {
    ...item,
    effectiveQuantity,
    baseAmount,
    addonsTotal,
    lineTotal,
  };
}

export function computeInvoiceTotals(
  invoice: ProformaInvoiceDraft,
  lineItems: LineItemDraft[]
): InvoiceCalculationSummary {
  const calculatedItems = lineItems.map(computeLineCalculation);
  const subtotal = round2(calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0));

  const discountAmount = 0;
  const taxableAmount = subtotal;
  const taxRate = Math.min(100, Math.max(0, Number(invoice.taxRate) || 0));
  const taxAmount = round2((taxableAmount * taxRate) / 100);
  const grandTotal = round2(taxableAmount + taxAmount);

  const prepaymentPercent = Math.min(100, Math.max(0, Number(invoice.prepaymentPercent) || 0));
  const prepaymentAmount = round2((grandTotal * prepaymentPercent) / 100);
  const balanceDue = round2(Math.max(0, grandTotal - prepaymentAmount));

  const totalAreaSqm = round2(
    calculatedItems.reduce(
      (sum, item) => (item.pricingMode === 'dimension' ? sum + item.effectiveQuantity : sum),
      0
    )
  );

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    grandTotal,
    prepaymentAmount,
    balanceDue,
    totalAreaSqm,
    itemCount: calculatedItems.length,
  };
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasDecimals = Math.abs(safe - Math.round(safe)) > 0.005;

  if (currency === 'ETB') {
    const formatted = safe.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${formatted} ETB`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatQty(qty: number): string {
  const safe = Number.isFinite(qty) ? qty : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function generateReferenceNumber(prefix = 'PF'): string {
  const cleanPrefix = (prefix || 'PF').toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'PF';
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-${y}${m}${d}-${rand}`;
}

export function formatReadableDate(isoDate: string): string {
  if (!isoDate) return '';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function generateSafeId(prefix = 'id'): string {
  const clean = prefix.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `${clean}_${randomPart}`;
}
