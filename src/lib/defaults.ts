import type { CatalogMaterial, LineItemDraft, ProformaInvoiceDraft, StudioSettings } from '../types/proforma';
import { generateReferenceNumber, generateSafeId } from './calculations';

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
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

export function createStarterInvoice(settings: StudioSettings = DEFAULT_STUDIO_SETTINGS): {
  invoice: ProformaInvoiceDraft;
  items: LineItemDraft[];
} {
  const today = new Date();
  const validDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    invoice: {
      id: generateSafeId('inv'),
      referenceNumber: generateReferenceNumber(settings.invoicePrefix),
      status: 'draft',
      issueDate: toIso(today),
      validUntil: toIso(validDate),
      clientName: 'Alsen',
      clientPhone: '+251 92 002 3039',
      clientAddress: 'Ambo City Residence',
      projectTitle: 'Living Room Joinery & Floating TV Console',
      currency: settings.defaultCurrency,
      discountType: 'percent',
      discountValue: 0,
      taxRate: settings.defaultTaxRate,
      prepaymentPercent: settings.defaultPrepaymentPercent,
      paymentTerms:
        '50% advance prepayment required to initiate workshop material procurement and CNC cutting. Remaining 50% balance payable upon site installation and final inspection. Quote valid for 14 calendar days.',
    },
    items: [
      {
        id: generateSafeId('item'),
        sortOrder: 0,
        title: 'Laminated MDF Wall Partition & Storage',
        specification: 'Standard MDF Joinery',
        pricingMode: 'dimension',
        width: 3.54,
        height: 3.0,
        quantity: 10.62,
        unitLabel: 'm²',
        unitPrice: 17000,
        addons: [],
      },
      {
        id: generateSafeId('item'),
        sortOrder: 1,
        title: 'Living Room Floating TV Unit',
        specification: 'UV High-Gloss / Super-Matte MDF',
        pricingMode: 'dimension',
        width: 3.7,
        height: 2.25,
        quantity: 8.33,
        unitLabel: 'm²',
        unitPrice: 22000,
        addons: [
          {
            id: generateSafeId('addon'),
            name: 'Integrated Warm LED Profile Channels (3000K)',
            price: 7500,
          },
          {
            id: generateSafeId('addon'),
            name: 'Blum Austria Soft-Close Hardware Upgrade',
            price: 8410,
          },
        ],
      },
    ],
  };
}

export function createBlankInvoice(settings: StudioSettings = DEFAULT_STUDIO_SETTINGS): {
  invoice: ProformaInvoiceDraft;
  items: LineItemDraft[];
} {
  const today = new Date();
  const validDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);

  return {
    invoice: {
      id: generateSafeId('inv'),
      referenceNumber: generateReferenceNumber(settings.invoicePrefix),
      status: 'draft',
      issueDate: toIso(today),
      validUntil: toIso(validDate),
      clientName: '',
      clientPhone: '',
      clientAddress: '',
      projectTitle: '',
      currency: settings.defaultCurrency,
      discountType: 'percent',
      discountValue: 0,
      taxRate: settings.defaultTaxRate,
      prepaymentPercent: settings.defaultPrepaymentPercent,
      paymentTerms: `${settings.defaultPrepaymentPercent}% advance prepayment required to initiate fabrication. Balance payable upon delivery and installation. Valid for 14 days.`,
    },
    items: [
      {
        id: generateSafeId('item'),
        sortOrder: 0,
        title: 'Custom Joinery Item',
        specification: 'Standard MDF Joinery',
        pricingMode: 'dimension',
        width: 2.4,
        height: 2.4,
        quantity: 5.76,
        unitLabel: 'm²',
        unitPrice: 17000,
        addons: [],
      },
    ],
  };
}

export const DEFAULT_CATALOG_MATERIALS: CatalogMaterial[] = [
  {
    id: 'cat_laminated_mdf',
    title: 'Laminated MDF',
    specification: 'Standard MDF Joinery',
    pricingMode: 'dimension',
    defaultWidth: 3.0,
    defaultHeight: 2.4,
    unitLabel: 'm²',
    unitPrice: 17000,
  },
  {
    id: 'cat_uv_gloss_tv',
    title: 'Living Room Floating TV Unit',
    specification: 'UV High-Gloss / Super-Matte MDF',
    pricingMode: 'dimension',
    defaultWidth: 3.6,
    defaultHeight: 2.25,
    unitLabel: 'm²',
    unitPrice: 22000,
  },
  {
    id: 'cat_full_wardrobe',
    title: 'Floor-to-Ceiling Sliding Wardrobe',
    specification: '18mm Turkish Melamine MDF + Aluminum Track',
    pricingMode: 'dimension',
    defaultWidth: 2.8,
    defaultHeight: 2.7,
    unitLabel: 'm²',
    unitPrice: 19500,
  },
  {
    id: 'cat_kitchen_cabinet',
    title: 'Modular Kitchen Upper & Base Cabinetry',
    specification: 'Moisture-Resistant Marine MDF + Acrylic Fronts',
    pricingMode: 'dimension',
    defaultWidth: 4.2,
    defaultHeight: 2.1,
    unitLabel: 'm²',
    unitPrice: 24500,
  },
  {
    id: 'cat_acoustic_slat',
    title: 'Acoustic Slatted Oak Feature Wall',
    specification: 'Natural Oak Veneer on Black Acoustic Felt',
    pricingMode: 'dimension',
    defaultWidth: 3.2,
    defaultHeight: 2.6,
    unitLabel: 'm²',
    unitPrice: 15500,
  },
  {
    id: 'cat_nightstand',
    title: 'Floating Bedside Nightstand Pair',
    specification: 'Matte Lacquered MDF + Push-to-Open Drawer',
    pricingMode: 'unit',
    defaultWidth: 0,
    defaultHeight: 0,
    unitLabel: 'pcs',
    unitPrice: 11500,
  },
];
