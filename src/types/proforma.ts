export type CurrencyCode = 'ETB' | 'USD' | 'EUR' | 'GBP';

export type InvoiceStatus = 'draft' | 'sent' | 'approved' | 'archived';

export type PricingMode = 'dimension' | 'unit';

export type DiscountType = 'percent' | 'fixed';

export interface LineAddon {
  id: string;
  name: string;
  price: number;
}

export interface LineItemDraft {
  id: string;
  sortOrder: number;
  title: string;
  specification: string;
  pricingMode: PricingMode;
  width: number;
  height: number;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  addons: LineAddon[];
}

export interface ProformaInvoiceDraft {
  id: string;
  referenceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  validUntil: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  projectTitle: string;
  currency: CurrencyCode;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
  prepaymentPercent: number;
  paymentTerms: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CalculatedLineItem extends LineItemDraft {
  effectiveQuantity: number;
  baseAmount: number;
  addonsTotal: number;
  lineTotal: number;
}

export interface InvoiceCalculationSummary {
  items: CalculatedLineItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  prepaymentAmount: number;
  balanceDue: number;
  totalAreaSqm: number;
  itemCount: number;
}

export interface StudioSettings {
  brandName: string;
  tagline: string;
  location: string;
  phone: string;
  messagingNote: string;
  email: string;
  bankLabel: string;
  bankAccount: string;
  mobileMoneyLabel: string;
  mobileMoneyAccount: string;
  executionLocation: string;
  warrantyNote: string;
  footerNote: string;
  defaultCurrency: CurrencyCode;
  defaultTaxRate: number;
  defaultPrepaymentPercent: number;
  invoicePrefix: string;
}

export interface CatalogMaterial {
  id: string;
  title: string;
  specification: string;
  pricingMode: PricingMode;
  defaultWidth: number;
  defaultHeight: number;
  unitLabel: string;
  unitPrice: number;
}

export interface SavedInvoiceRecord extends ProformaInvoiceDraft {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  itemCount: number;
}

export interface ExtractedScopeItem {
  title: string;
  specification: string;
  pricingMode: PricingMode;
  width: number;
  height: number;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
  addons: { name: string; price: number }[];
}

export interface ExtractedScopeResponse {
  clientName: string;
  clientPhone: string;
  clientAddress?: string;
  projectTitle: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  summaryNotes: string;
  items: ExtractedScopeItem[];
}
