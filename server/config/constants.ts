export interface CatalogHint {
  title: string;
  specification?: string;
  pricingMode: 'dimension' | 'unit';
  unitLabel: string;
  unitPrice: number;
}

export const PORT = 3000;

export const PUBLIC_STUDIO_PROFILE = {
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

export const PUBLIC_CATALOG_ITEMS = [
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
