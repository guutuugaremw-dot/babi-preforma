import { useState } from 'react';
import { Check, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { formatMoney, generateSafeId } from '../lib/calculations';
import type { CatalogMaterial, CurrencyCode, PricingMode } from '../types/proforma';

interface CatalogViewProps {
  catalog: CatalogMaterial[];
  defaultCurrency: CurrencyCode;
  portalShareUrl: string;
  isSignedIn: boolean;
  onSaveMaterial: (item: CatalogMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onInsertToInvoice: (item: CatalogMaterial) => void;
  onOpenPortal: () => void;
}

export function CatalogView({
  catalog,
  defaultCurrency,
  portalShareUrl,
  isSignedIn,
  onSaveMaterial,
  onDeleteMaterial,
  onInsertToInvoice,
  onOpenPortal,
}: CatalogViewProps) {
  const [title, setTitle] = useState('');
  const [specification, setSpecification] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('dimension');
  const [defaultWidth, setDefaultWidth] = useState(3.0);
  const [defaultHeight, setDefaultHeight] = useState(2.4);
  const [unitLabel, setUnitLabel] = useState('m²');
  const [unitPrice, setUnitPrice] = useState(17000);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveMaterial({
      id: generateSafeId('cat'),
      title: title.trim(),
      specification: specification.trim(),
      pricingMode,
      defaultWidth: pricingMode === 'dimension' ? defaultWidth : 0,
      defaultHeight: pricingMode === 'dimension' ? defaultHeight : 0,
      unitLabel: unitLabel.trim() || (pricingMode === 'dimension' ? 'm²' : 'pcs'),
      unitPrice: Math.max(0, Number(unitPrice) || 0),
    });

    setTitle('');
    setSpecification('');
  };

  const handleCopyPortalUrl = async () => {
    try {
      await navigator.clipboard.writeText(portalShareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Studio Material &amp; Rate Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Reusable joinery, finish, and hardware unit rates exposed to your invoice builder and Client Portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyPortalUrl}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Portal Link Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{isSignedIn ? 'Copy Public Portal Link' : 'Copy Preview Portal Link'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenPortal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Client Portal</span>
          </button>
        </div>
      </div>

      {/* Add Material Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-slate-900">Add Rate Preset</h2>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Material / Item Name
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Laminated MDF Partition"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Specification
            </label>
            <input
              type="text"
              value={specification}
              onChange={(e) => setSpecification(e.target.value)}
              placeholder="e.g. 18mm High-Gloss MDF"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Pricing Mode
            </label>
            <select
              value={pricingMode}
              onChange={(e) => {
                const mode = e.target.value as PricingMode;
                setPricingMode(mode);
                setUnitLabel(mode === 'dimension' ? 'm²' : 'pcs');
              }}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            >
              <option value="dimension">Dimension (m²)</option>
              <option value="unit">Unit Qty</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Unit Label
            </label>
            <input
              type="text"
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
            />
          </div>

          {pricingMode === 'dimension' && (
            <>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default Width (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={defaultWidth}
                  onChange={(e) => setDefaultWidth(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Default Height (m)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={defaultHeight}
                  onChange={(e) => setDefaultHeight(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900"
                />
              </div>
            </>
          )}

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Unit Rate ({defaultCurrency})
            </label>
            <input
              type="number"
              step="100"
              min="0"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono tabular-nums text-slate-900"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save to Catalog</span>
            </button>
          </div>
        </div>
      </form>

      {/* Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="py-2.5 px-4">Item &amp; Specification</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Default Size</th>
                <th className="py-2.5 px-4 text-right">Unit Rate</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {catalog.map((item) => (
                <tr key={item.id} className="h-11 hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-slate-900">{item.title}</div>
                    {item.specification && (
                      <div className="text-[11px] text-slate-500">{item.specification}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {item.pricingMode === 'dimension' ? 'Dimension (W × H)' : 'Unit Quantity'}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600">
                    {item.pricingMode === 'dimension'
                      ? `${item.defaultWidth}m × ${item.defaultHeight}m`
                      : `1 ${item.unitLabel}`}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                    {formatMoney(item.unitPrice, defaultCurrency)} / {item.unitLabel}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onInsertToInvoice(item)}
                        className="px-2.5 py-1 text-xs font-medium text-amber-800 hover:text-amber-950 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                      >
                        + Add to Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(item.id)}
                        aria-label={`Delete ${item.title}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
