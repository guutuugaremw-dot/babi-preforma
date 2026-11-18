import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  computeLineCalculation,
  formatMoney,
  formatQty,
  generateReferenceNumber,
  generateSafeId,
} from '../lib/calculations';
import type {
  CatalogMaterial,
  CurrencyCode,
  InvoiceCalculationSummary,
  InvoiceStatus,
  LineItemDraft,
  PricingMode,
  ProformaInvoiceDraft,
} from '../types/proforma';

interface InvoiceEditorProps {
  invoice: ProformaInvoiceDraft;
  items: LineItemDraft[];
  summary: InvoiceCalculationSummary;
  catalog: CatalogMaterial[];
  invoicePrefix: string;
  onChangeInvoice: (patch: Partial<ProformaInvoiceDraft>) => void;
  onChangeItems: (items: LineItemDraft[]) => void;
}

const CURRENCIES: CurrencyCode[] = ['ETB', 'USD', 'EUR', 'GBP'];
const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'archived', label: 'Archived' },
];

export function InvoiceEditor({
  invoice,
  items,
  summary,
  catalog,
  invoicePrefix,
  onChangeInvoice,
  onChangeItems,
}: InvoiceEditorProps) {
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('');
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddBlankItem = () => {
    const newItem: LineItemDraft = {
      id: generateSafeId('item'),
      sortOrder: items.length,
      title: 'Custom Fabrication Item',
      specification: 'Standard MDF Joinery',
      pricingMode: 'dimension',
      width: 2.5,
      height: 2.4,
      quantity: 6,
      unitLabel: 'm²',
      unitPrice: 17000,
      addons: [],
    };
    onChangeItems([...items, newItem]);
  };

  const handleAddFromCatalog = (catalogId: string) => {
    setSelectedCatalogId('');
    const preset = catalog.find((c) => c.id === catalogId);
    if (!preset) return;

    const newItem: LineItemDraft = {
      id: generateSafeId('item'),
      sortOrder: items.length,
      title: preset.title,
      specification: preset.specification,
      pricingMode: preset.pricingMode,
      width: preset.defaultWidth || 2.0,
      height: preset.defaultHeight || 2.0,
      quantity:
        preset.pricingMode === 'dimension'
          ? Math.round((preset.defaultWidth || 2) * (preset.defaultHeight || 2) * 100) / 100
          : 1,
      unitLabel: preset.unitLabel,
      unitPrice: preset.unitPrice,
      addons: [],
    };
    onChangeItems([...items, newItem]);
  };

  const updateItem = (id: string, patch: Partial<LineItemDraft>) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...patch };
        if (next.pricingMode === 'dimension') {
          next.quantity = Math.round((next.width || 0) * (next.height || 0) * 100) / 100;
        }
        return next;
      })
    );
  };

  const handlePricingModeChange = (id: string, mode: PricingMode) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== id) return item;
        if (mode === 'dimension') {
          const w = item.width > 0 ? item.width : 2.0;
          const h = item.height > 0 ? item.height : 2.0;
          return {
            ...item,
            pricingMode: 'dimension',
            width: w,
            height: h,
            quantity: Math.round(w * h * 100) / 100,
            unitLabel: item.unitLabel === 'pcs' || item.unitLabel === 'set' ? 'm²' : item.unitLabel,
          };
        }
        return {
          ...item,
          pricingMode: 'unit',
          quantity: item.quantity > 0 ? item.quantity : 1,
          unitLabel: item.unitLabel === 'm²' ? 'pcs' : item.unitLabel,
        };
      })
    );
  };

  const removeItem = (id: string) => {
    onChangeItems(
      items
        .filter((item) => item.id !== id)
        .map((item, idx) => ({ ...item, sortOrder: idx }))
    );
  };

  const addAddon = (itemId: string) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId || item.addons.length >= 10) return item;
        return {
          ...item,
          addons: [
            ...item.addons,
            {
              id: generateSafeId('addon'),
              name: 'Hardware / Lighting Upgrade',
              price: 5000,
            },
          ],
        };
      })
    );
  };

  const updateAddon = (
    itemId: string,
    addonId: string,
    patch: { name?: string; price?: number }
  ) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          addons: item.addons.map((a) => (a.id === addonId ? { ...a, ...patch } : a)),
        };
      })
    );
  };

  const removeAddon = (itemId: string, addonId: string) => {
    onChangeItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          addons: item.addons.filter((a) => a.id !== addonId),
        };
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Document Metadata & Client Details */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            1. Client &amp; Reference Details
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono tabular-nums">
              {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
            </span>
            {summary.totalAreaSqm > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {formatQty(summary.totalAreaSqm)} m² total
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ref-number" className="block text-xs font-medium text-slate-600 mb-1">
              Reference Number
            </label>
            <div className="flex items-center gap-2">
              <input
                id="ref-number"
                type="text"
                value={invoice.referenceNumber}
                onChange={(e) =>
                  onChangeInvoice({
                    referenceNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
              />
              <button
                type="button"
                title="Generate new unique reference number"
                onClick={() =>
                  onChangeInvoice({
                    referenceNumber: generateReferenceNumber(invoicePrefix),
                  })
                }
                className="p-2 text-slate-500 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="inv-status" className="block text-xs font-medium text-slate-600 mb-1">
                Status
              </label>
              <select
                id="inv-status"
                value={invoice.status}
                onChange={(e) =>
                  onChangeInvoice({ status: e.target.value as InvoiceStatus })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="inv-currency" className="block text-xs font-medium text-slate-600 mb-1">
                Currency
              </label>
              <select
                id="inv-currency"
                value={invoice.currency}
                onChange={(e) =>
                  onChangeInvoice({ currency: e.target.value as CurrencyCode })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="issue-date" className="block text-xs font-medium text-slate-600 mb-1">
              Issue Date
            </label>
            <input
              id="issue-date"
              type="date"
              value={invoice.issueDate}
              onChange={(e) => onChangeInvoice({ issueDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          <div>
            <label htmlFor="valid-until" className="block text-xs font-medium text-slate-600 mb-1">
              Valid Until
            </label>
            <input
              id="valid-until"
              type="date"
              value={invoice.validUntil}
              onChange={(e) => onChangeInvoice({ validUntil: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          <div>
            <label htmlFor="client-name" className="block text-xs font-medium text-slate-600 mb-1">
              Client Name
            </label>
            <input
              id="client-name"
              type="text"
              value={invoice.clientName}
              onChange={(e) => onChangeInvoice({ clientName: e.target.value })}
              placeholder="e.g. Alsen"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          <div>
            <label htmlFor="client-phone" className="block text-xs font-medium text-slate-600 mb-1">
              Client Phone
            </label>
            <input
              id="client-phone"
              type="text"
              value={invoice.clientPhone}
              onChange={(e) => onChangeInvoice({ clientPhone: e.target.value })}
              placeholder="+251 9X XXX XXXX"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          <div>
            <label htmlFor="project-title" className="block text-xs font-medium text-slate-600 mb-1">
              Project Title
            </label>
            <input
              id="project-title"
              type="text"
              value={invoice.projectTitle}
              onChange={(e) => onChangeInvoice({ projectTitle: e.target.value })}
              placeholder="e.g. Living Room Joinery & TV Unit"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>

          <div>
            <label htmlFor="client-address" className="block text-xs font-medium text-slate-600 mb-1">
              Site Location / Address
            </label>
            <input
              id="client-address"
              type="text"
              value={invoice.clientAddress}
              onChange={(e) => onChangeInvoice({ clientAddress: e.target.value })}
              placeholder="City or neighborhood"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Line Items & Dimensions Engine */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            2. Scope &amp; Dimension Line Items
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Add preset from material catalog"
              value={selectedCatalogId}
              onChange={(e) => {
                if (e.target.value) handleAddFromCatalog(e.target.value);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            >
              <option value="">+ Quick Add from Catalog...</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({formatMoney(c.unitPrice, invoice.currency)}/{c.unitLabel})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddBlankItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-slate-500">
              No line items in this pro forma yet.
            </p>
            <button
              type="button"
              onClick={handleAddBlankItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Line Item</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {items.map((item, idx) => {
              const calc = computeLineCalculation(item);
              const isCollapsed = !!collapsedItems[item.id];

              return (
                <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                  {/* Item Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(item.id)}
                      className="flex items-center gap-2 text-left min-w-0 cursor-pointer"
                    >
                      <span className="font-mono tabular-nums text-xs font-semibold text-slate-400 w-5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {item.title || 'Untitled Item'}
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums text-sm font-bold text-slate-900">
                        {formatMoney(calc.lineTotal, invoice.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.title || 'item'}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-7 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Item Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => updateItem(item.id, { title: e.target.value })}
                            placeholder="e.g. Living Room Floating TV Unit"
                            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Material / Finish Specification
                          </label>
                          <input
                            type="text"
                            value={item.specification}
                            onChange={(e) =>
                              updateItem(item.id, { specification: e.target.value })
                            }
                            placeholder="e.g. UV High-Gloss / Super-Matte MDF"
                            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
                          />
                        </div>
                      </div>

                      {/* Pricing Mode + Measurements */}
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end">
                        <div className="col-span-2 sm:col-span-4">
                          <span className="block text-[11px] font-medium text-slate-500 mb-1">
                            Calculation Mode
                          </span>
                          <div className="flex items-center p-0.5 bg-slate-100 rounded-md">
                            <button
                              type="button"
                              onClick={() => handlePricingModeChange(item.id, 'dimension')}
                              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                                item.pricingMode === 'dimension'
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              W × H (m²)
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePricingModeChange(item.id, 'unit')}
                              className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                                item.pricingMode === 'unit'
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Unit Qty
                            </button>
                          </div>
                        </div>

                        {item.pricingMode === 'dimension' ? (
                          <>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                Width (m)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.width}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    width: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                Height (m)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.height}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    height: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                Qty
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.id, {
                                    quantity: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                            </div>
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                Unit
                              </label>
                              <input
                                type="text"
                                value={item.unitLabel}
                                onChange={(e) =>
                                  updateItem(item.id, { unitLabel: e.target.value })
                                }
                                placeholder="pcs"
                                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                            </div>
                          </>
                        )}

                        <div className="col-span-2 sm:col-span-4">
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Unit Price ({invoice.currency} / {item.unitLabel || 'unit'})
                          </label>
                          <input
                            type="number"
                            step="100"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, {
                                unitPrice: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                          />
                        </div>
                      </div>

                      {/* Computed Line Breakdown + Add-ons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
                        <div className="font-mono tabular-nums">
                          {formatQty(calc.effectiveQuantity)} {item.unitLabel} ×{' '}
                          {formatMoney(item.unitPrice, invoice.currency)} ={' '}
                          <span className="text-slate-700 font-semibold">
                            {formatMoney(calc.baseAmount, invoice.currency)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => addAddon(item.id)}
                          disabled={item.addons.length >= 10}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:text-amber-950 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Hardware / Upgrade</span>
                        </button>
                      </div>

                      {item.addons.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {item.addons.map((addon) => (
                            <div
                              key={addon.id}
                              className="flex flex-wrap sm:flex-nowrap items-center gap-2"
                            >
                              <input
                                type="text"
                                value={addon.name}
                                onChange={(e) =>
                                  updateAddon(item.id, addon.id, { name: e.target.value })
                                }
                                placeholder="Upgrade description"
                                className="flex-1 min-w-[160px] rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                              <input
                                type="number"
                                step="100"
                                min="0"
                                value={addon.price}
                                onChange={(e) =>
                                  updateAddon(item.id, addon.id, {
                                    price: Math.max(0, parseFloat(e.target.value) || 0),
                                  })
                                }
                                className="w-32 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-mono tabular-nums text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
                              />
                              <button
                                type="button"
                                onClick={() => removeAddon(item.id, addon.id)}
                                aria-label="Remove upgrade"
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Taxes & Payment Terms */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            3. Taxes &amp; Payment Terms
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="tax-rate" className="text-xs font-medium text-slate-600">
                Applicable Tax / VAT (%)
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChangeInvoice({ taxRate: 0 })}
                  className="text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  0%
                </button>
                <button
                  type="button"
                  onClick={() => onChangeInvoice({ taxRate: 15 })}
                  className="text-amber-800 hover:text-amber-950 underline cursor-pointer"
                >
                  15% VAT
                </button>
              </div>
            </div>
            <input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={invoice.taxRate}
              onChange={(e) =>
                onChangeInvoice({
                  taxRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          <div>
            <label htmlFor="prepayment-pct" className="block text-xs font-medium text-slate-600 mb-1">
              Prepayment Deposit (%)
            </label>
            <input
              id="prepayment-pct"
              type="number"
              min="0"
              max="100"
              step="5"
              value={invoice.prepaymentPercent}
              onChange={(e) =>
                onChangeInvoice({
                  prepaymentPercent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment-terms" className="block text-xs font-medium text-slate-600 mb-1">
            Payment Terms &amp; Delivery Notes
          </label>
          <textarea
            id="payment-terms"
            rows={2}
            value={invoice.paymentTerms}
            onChange={(e) => onChangeInvoice({ paymentTerms: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>

        {/* Instant Financial Summary Strip */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-slate-500">Subtotal</div>
            <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {formatMoney(summary.subtotal, invoice.currency)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Tax ({invoice.taxRate}%)</div>
            <div className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {formatMoney(summary.taxAmount, invoice.currency)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">Grand Total</div>
            <div className="font-mono tabular-nums font-bold text-amber-800 text-sm mt-0.5">
              {formatMoney(summary.grandTotal, invoice.currency)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
