import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  computeInvoiceTotals,
  computeLineCalculation,
  formatMoney,
  formatQty,
  generateReferenceNumber,
  generateSafeId,
} from '../lib/calculations';
import { exportProformaPdf } from '../lib/pdfExport';
import type {
  CatalogMaterial,
  ExtractedScopeResponse,
  LineItemDraft,
  ProformaInvoiceDraft,
  StudioSettings,
} from '../types/proforma';
import { InvoicePreview } from './InvoicePreview';

interface ClientPortalViewProps {
  studio: StudioSettings;
  catalog: CatalogMaterial[];
  isStandalone?: boolean;
  portalShareUrl?: string;
  onImportToEditor?: (invoice: ProformaInvoiceDraft, items: LineItemDraft[]) => void;
  onRegisterExport?: (fn: () => void) => void;
}

const COMMON_UPGRADES = [
  { name: 'Integrated Warm LED Profile Channels (3000K)', price: 7500 },
  { name: 'Blum Austria Soft-Close Hardware Upgrade', price: 8410 },
  { name: 'Tempered Bronze Mirror Accent Backing', price: 6200 },
];

const PORTAL_PROMPT_EXAMPLES = [
  'Living room floating TV unit 3.7m x 2.25m with LED lighting and laminated MDF wall partition 3.54m x 3m',
  'Master bedroom sliding wardrobe 3.2m x 2.7m plus 2 floating bedside nightstands',
];

export function ClientPortalView({
  studio,
  catalog,
  isStandalone = false,
  portalShareUrl,
  onImportToEditor,
  onRegisterExport,
}: ClientPortalViewProps) {
  const [logoError, setLogoError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [projectTitle, setProjectTitle] = useState('Custom Interior Joinery Quote');
  const [referenceNumber, setReferenceNumber] = useState(() =>
    generateReferenceNumber(studio.invoicePrefix)
  );

  // Custom natural-language prompt state for clients
  const [customPrompt, setCustomPrompt] = useState('');
  const [isExtractingPrompt, setIsExtractingPrompt] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [promptNotice, setPromptNotice] = useState<string | null>(null);

  const hasUserInteractedRef = useRef(false);

  const [selectedItems, setSelectedItems] = useState<LineItemDraft[]>(() => {
    const first = catalog[0];
    if (!first) return [];
    return [
      {
        id: generateSafeId('portal'),
        sortOrder: 0,
        title: first.title,
        specification: first.specification,
        pricingMode: first.pricingMode,
        width: first.defaultWidth || 2.5,
        height: first.defaultHeight || 2.4,
        quantity:
          first.pricingMode === 'dimension'
            ? Math.round((first.defaultWidth || 2.5) * (first.defaultHeight || 2.4) * 100) / 100
            : 1,
        unitLabel: first.unitLabel,
        unitPrice: first.unitPrice,
        addons: [],
      },
    ];
  });

  // Synchronize default starter item & reference prefix when remote studio catalog finishes loading
  useEffect(() => {
    setReferenceNumber((prev) => {
      const prefix = (studio.invoicePrefix || 'PF').toUpperCase();
      return prev.startsWith(`${prefix}-`) ? prev : generateReferenceNumber(prefix);
    });
  }, [studio.invoicePrefix]);

  useEffect(() => {
    if (hasUserInteractedRef.current) return;
    if (selectedItems.length === 0 && catalog.length > 0) {
      const first = catalog[0];
      setSelectedItems([
        {
          id: generateSafeId('portal'),
          sortOrder: 0,
          title: first.title,
          specification: first.specification,
          pricingMode: first.pricingMode,
          width: first.defaultWidth || 2.5,
          height: first.defaultHeight || 2.4,
          quantity:
            first.pricingMode === 'dimension'
              ? Math.round((first.defaultWidth || 2.5) * (first.defaultHeight || 2.4) * 100) / 100
              : 1,
          unitLabel: first.unitLabel,
          unitPrice: first.unitPrice,
          addons: [],
        },
      ]);
    }
  }, [catalog, selectedItems.length]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.specification.toLowerCase().includes(q)
    );
  }, [catalog, searchQuery]);

  const selectedCountByTitle = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of selectedItems) {
      const key = item.title.trim().toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [selectedItems]);

  const portalInvoice: ProformaInvoiceDraft = useMemo(() => {
    const today = new Date();
    const valid = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      id: generateSafeId('inv'),
      referenceNumber,
      status: 'draft',
      issueDate: today.toISOString().slice(0, 10),
      validUntil: valid.toISOString().slice(0, 10),
      clientName: clientName.trim() || 'Prospective Client',
      clientPhone: clientPhone.trim(),
      clientAddress: clientAddress.trim(),
      projectTitle: projectTitle.trim() || 'Custom Interior Scope',
      currency: studio.defaultCurrency,
      discountType: 'percent',
      discountValue: 0,
      taxRate: studio.defaultTaxRate,
      prepaymentPercent: studio.defaultPrepaymentPercent,
      paymentTerms: `${studio.defaultPrepaymentPercent}% advance prepayment required to initiate workshop material procurement. Balance payable upon delivery and site installation. Quote valid for 14 days.`,
    };
  }, [
    referenceNumber,
    clientName,
    clientPhone,
    clientAddress,
    projectTitle,
    studio,
  ]);

  const summary = useMemo(
    () => computeInvoiceTotals(portalInvoice, selectedItems),
    [portalInvoice, selectedItems]
  );

  useEffect(() => {
    if (!onRegisterExport) return;
    onRegisterExport(() => {
      void exportProformaPdf(portalInvoice, summary, studio);
    });
  }, [onRegisterExport, portalInvoice, summary, studio]);

  const handleSelectCatalogItem = (mat: CatalogMaterial) => {
    hasUserInteractedRef.current = true;
    const nextItem: LineItemDraft = {
      id: generateSafeId('portal'),
      sortOrder: selectedItems.length,
      title: mat.title,
      specification: mat.specification,
      pricingMode: mat.pricingMode,
      width: mat.defaultWidth || 2.4,
      height: mat.defaultHeight || 2.2,
      quantity:
        mat.pricingMode === 'dimension'
          ? Math.round((mat.defaultWidth || 2.4) * (mat.defaultHeight || 2.2) * 100) / 100
          : 1,
      unitLabel: mat.unitLabel,
      unitPrice: mat.unitPrice,
      addons: [],
    };
    setSelectedItems((prev) => [...prev, nextItem]);
  };

  const handleRemoveByCatalogTitle = (title: string) => {
    hasUserInteractedRef.current = true;
    const target = title.trim().toLowerCase();
    setSelectedItems((prev) => {
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        if (prev[i].title.trim().toLowerCase() === target) {
          idx = i;
          break;
        }
      }
      if (idx === -1) return prev;
      const next = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      return next.map((it, i) => ({ ...it, sortOrder: i }));
    });
  };

  const updateSelectedItem = (id: string, patch: Partial<LineItemDraft>) => {
    hasUserInteractedRef.current = true;
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (next.pricingMode === 'dimension') {
          next.quantity = Math.round((next.width || 0) * (next.height || 0) * 100) / 100;
        }
        return next;
      })
    );
  };

  const toggleCommonUpgrade = (
    itemId: string,
    upgrade: { name: string; price: number }
  ) => {
    hasUserInteractedRef.current = true;
    setSelectedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.addons.some((a) => a.name === upgrade.name);
        if (exists) {
          return {
            ...item,
            addons: item.addons.filter((a) => a.name !== upgrade.name),
          };
        }
        if (item.addons.length >= 10) return item;
        return {
          ...item,
          addons: [
            ...item.addons,
            { id: generateSafeId('addon'), name: upgrade.name, price: upgrade.price },
          ],
        };
      })
    );
  };

  const removeSelectedItem = (id: string) => {
    hasUserInteractedRef.current = true;
    setSelectedItems((prev) =>
      prev.filter((it) => it.id !== id).map((it, idx) => ({ ...it, sortOrder: idx }))
    );
  };

  const handleExtractFromPrompt = async () => {
    if (!customPrompt.trim()) {
      setPromptError('Describe the items and dimensions you need first.');
      return;
    }
    setIsExtractingPrompt(true);
    setPromptError(null);
    setPromptNotice(null);

    try {
      const response = await fetch('/api/ai/extract-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt.trim(),
          defaultCurrency: studio.defaultCurrency,
          catalog: catalog.map((c) => ({
            title: c.title,
            specification: c.specification,
            pricingMode: c.pricingMode,
            unitLabel: c.unitLabel,
            unitPrice: c.unitPrice,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not parse your request.');
      }

      const extracted = data as ExtractedScopeResponse;
      const mappedItems: LineItemDraft[] = (extracted.items || []).map((item, idx) => ({
        id: generateSafeId('portal'),
        sortOrder: idx,
        title: item.title || 'Custom Scope Item',
        specification: item.specification || '',
        pricingMode: item.pricingMode === 'unit' ? 'unit' : 'dimension',
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        quantity:
          item.pricingMode === 'dimension'
            ? Math.round((Number(item.width) || 0) * (Number(item.height) || 0) * 100) / 100
            : Number(item.quantity) || 1,
        unitLabel: item.unitLabel || (item.pricingMode === 'unit' ? 'pcs' : 'm²'),
        unitPrice: Number(item.unitPrice) || 0,
        addons: (item.addons || []).slice(0, 10).map((a) => ({
          id: generateSafeId('addon'),
          name: a.name,
          price: Number(a.price) || 0,
        })),
      }));

      if (mappedItems.length === 0) {
        throw new Error('No line items could be matched. Please select items from the catalog below.');
      }

      hasUserInteractedRef.current = true;
      setSelectedItems(mappedItems);
      if (extracted.clientName && !clientName.trim()) setClientName(extracted.clientName);
      if (extracted.clientPhone && !clientPhone.trim()) setClientPhone(extracted.clientPhone);
      if (extracted.clientAddress && !clientAddress.trim()) setClientAddress(extracted.clientAddress);
      if (extracted.projectTitle) setProjectTitle(extracted.projectTitle);
      setPromptNotice(`Populated ${mappedItems.length} item${mappedItems.length === 1 ? '' : 's'} into your Pro Forma.`);
    } catch (err) {
      setPromptError(err instanceof Error ? err.message : 'Unable to process request.');
    } finally {
      setIsExtractingPrompt(false);
    }
  };

  const handleCopyPortalLink = async () => {
    if (!portalShareUrl) return;
    try {
      await navigator.clipboard.writeText(portalShareUrl);
      setCopiedPortalLink(true);
      setTimeout(() => setCopiedPortalLink(false), 2400);
    } catch {
      // Clipboard blocked
    }
  };

  const handleCopySummary = async () => {
    const lines = [
      `${studio.brandName} ${studio.tagline} — Pro Forma Request`,
      `Ref: ${portalInvoice.referenceNumber}`,
      `Client: ${portalInvoice.clientName}${portalInvoice.clientPhone ? ` (${portalInvoice.clientPhone})` : ''}`,
      portalInvoice.clientAddress ? `Site: ${portalInvoice.clientAddress}` : '',
      '',
      'Selected Items:',
      ...summary.items.map(
        (it, i) =>
          `${i + 1}. ${it.title} (${it.pricingMode === 'dimension' ? `${it.width}m x ${it.height}m = ${formatQty(it.effectiveQuantity)} ${it.unitLabel}` : `${formatQty(it.effectiveQuantity)} ${it.unitLabel}`}) — ${formatMoney(it.lineTotal, portalInvoice.currency)}`
      ),
      '',
      `Total: ${formatMoney(summary.grandTotal, portalInvoice.currency)}`,
      `${portalInvoice.prepaymentPercent}% Prepayment: ${formatMoney(summary.prepaymentAmount, portalInvoice.currency)}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Public Header Banner */}
      <div className="no-print bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-[#21252b] border border-[#d4a373] p-1 flex items-center justify-center shrink-0 overflow-hidden">
            {!logoError ? (
              <img
                src="/assets/aistudio/image_97dc7301.png"
                alt={`${studio.brandName} Logo`}
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-display text-xl font-bold text-[#d4a373]">
                {(studio.brandName || 'B').slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900">
              {studio.brandName} — Client Pro Forma Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pick items from our catalog or describe your project below to automatically generate your official pro forma invoice.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isStandalone && portalShareUrl && (
            <button
              type="button"
              onClick={handleCopyPortalLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedPortalLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Public Link Copied</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Copy Public Portal Link</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            disabled={selectedItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedSummary ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Quote Summary Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Quote for WhatsApp</span>
              </>
            )}
          </button>

          {!isStandalone && onImportToEditor && (
            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => {
                onImportToEditor(portalInvoice, selectedItems);
                setReferenceNumber(generateReferenceNumber(studio.invoicePrefix));
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Open in Studio Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={selectedItems.length === 0}
            onClick={() => exportProformaPdf(portalInvoice, summary, studio)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Pro Forma PDF</span>
          </button>
        </div>
      </div>

      {/* Main Split: Catalog & Configurator (Left) + Live Auto-Generated Pro Forma (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="no-print lg:col-span-6 space-y-6">
          {/* Client Info Form */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
              1. Your Contact &amp; Site Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+251 9X XXX XXXX"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Project / Room
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Living Room & Kitchen"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Installation City / Location
                </label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="e.g. Ambo City"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
              </div>
            </div>
          </section>

          {/* Optional Custom Prompt Auto-Fill */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Quick Request by Custom Prompt (Optional)
                </h2>
                <p className="text-xs text-slate-500">
                  Describe the rooms, furniture, and dimensions in plain language to auto-fill catalog items.
                </p>
              </div>
            </div>

            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. Need a floating TV unit 3.6m x 2.25m with LED lighting and a 3.2m x 2.7m sliding wardrobe..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {PORTAL_PROMPT_EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomPrompt(example)}
                    className="text-[11px] font-medium text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    Try example {idx + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={isExtractingPrompt || !customPrompt.trim()}
                onClick={handleExtractFromPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isExtractingPrompt ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Building Pro Forma...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Fill Quote</span>
                  </>
                )}
              </button>
            </div>

            {promptError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {promptError}
              </div>
            )}
            {promptNotice && !promptError && (
              <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                {promptNotice}
              </div>
            )}
          </section>

          {/* Public Catalog Picker */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  2. Select Products from Catalog
                </h2>
                <p className="text-xs text-slate-500">
                  Choose items below to add them directly to your pro forma estimate.
                </p>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter catalog..."
                  className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                />
              </div>
            </div>

            {filteredCatalog.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                No catalog items match your search.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCatalog.map((mat) => {
                  const selectedCount =
                    selectedCountByTitle.get(mat.title.trim().toLowerCase()) || 0;
                  return (
                    <div
                      key={mat.id}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {mat.title}
                          </span>
                          {selectedCount > 0 && (
                            <span className="text-[11px] font-semibold text-amber-800 shrink-0 font-mono tabular-nums">
                              Selected ({selectedCount})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>{mat.specification || 'Standard Finish'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums font-medium text-slate-700">
                            {formatMoney(mat.unitPrice, studio.defaultCurrency)} / {mat.unitLabel}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveByCatalogTitle(mat.title)}
                            className="text-xs font-medium text-slate-500 hover:text-red-600 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectCatalogItem(mat)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-amber-100 hover:text-amber-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{selectedCount > 0 ? 'Add Another' : 'Select'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Configure Dimensions & Upgrades for Selected Items */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                3. Configure Your Dimensions &amp; Upgrades ({selectedItems.length})
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      hasUserInteractedRef.current = true;
                      setSelectedItems([]);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <span className="font-mono tabular-nums text-xs font-bold text-amber-800">
                  {formatMoney(summary.grandTotal, studio.defaultCurrency)}
                </span>
              </div>
            </div>

            {selectedItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Select at least one product above to configure dimensions and generate your pro forma details.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {selectedItems.map((item, idx) => {
                  const calc = computeLineCalculation(item);
                  return (
                    <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {idx + 1}. {item.title}
                          </div>
                          <div className="text-xs text-slate-500">{item.specification}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                            {formatMoney(calc.lineTotal, studio.defaultCurrency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSelectedItem(item.id)}
                            aria-label={`Remove ${item.title}`}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {item.pricingMode === 'dimension' ? (
                        <div className="grid grid-cols-3 gap-3 items-end">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Width (m)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.width}
                              onChange={(e) =>
                                updateSelectedItem(item.id, {
                                  width: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Height (m)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.height}
                              onChange={(e) =>
                                updateSelectedItem(item.id, {
                                  height: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900"
                            />
                          </div>
                          <div className="text-right font-mono tabular-nums text-xs text-slate-600 pb-2">
                            Area: <strong>{formatQty(calc.effectiveQuantity)} m²</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 items-end">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-500 mb-1">
                              Quantity ({item.unitLabel})
                            </label>
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateSelectedItem(item.id, {
                                  quantity: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900"
                            />
                          </div>
                          <div className="text-right font-mono tabular-nums text-xs text-slate-600 pb-2">
                            Rate: {formatMoney(item.unitPrice, studio.defaultCurrency)}/{item.unitLabel}
                          </div>
                        </div>
                      )}

                      {/* Optional Upgrades Checkboxes */}
                      <div className="space-y-1.5 pt-1">
                        <span className="block text-[11px] font-medium text-slate-500">
                          Optional Studio Upgrades
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {COMMON_UPGRADES.map((up) => {
                            const checked = item.addons.some((a) => a.name === up.name);
                            return (
                              <label
                                key={up.name}
                                className="flex items-center justify-between gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                              >
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleCommonUpgrade(item.id, up)}
                                    className="rounded border-slate-300 text-amber-700 focus:ring-amber-700"
                                  />
                                  <span>{up.name}</span>
                                </span>
                                <span className="font-mono tabular-nums text-slate-600 shrink-0">
                                  +{formatMoney(up.price, studio.defaultCurrency)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Auto-Generated Live Pro Forma Preview */}
        <div className="lg:col-span-6 lg:sticky lg:top-20">
          <InvoicePreview
            invoice={portalInvoice}
            summary={summary}
            studio={studio}
            onExportPdf={() => exportProformaPdf(portalInvoice, summary, studio)}
            onPrint={() => window.print()}
          />
        </div>
      </div>
    </div>
  );
}
