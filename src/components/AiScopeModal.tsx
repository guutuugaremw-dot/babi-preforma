import { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { formatMoney, generateSafeId } from '../lib/calculations';
import type {
  CatalogMaterial,
  CurrencyCode,
  ExtractedScopeResponse,
  LineItemDraft,
} from '../types/proforma';

interface AiScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogMaterial[];
  currency: CurrencyCode;
  onApplyScope: (
    mode: 'append' | 'replace',
    items: LineItemDraft[],
    meta: {
      clientName?: string;
      clientPhone?: string;
      clientAddress?: string;
      projectTitle?: string;
      discountType?: 'percent' | 'fixed';
      discountValue?: number;
      taxRate?: number;
    }
  ) => void;
}

const SAMPLE_BRIEFS = [
  {
    label: 'Alsen Living Room Joinery',
    text: 'Client Alsen (+251 92 002 3039) needs laminated MDF wall paneling measuring 3.54m by 3m in standard joinery, plus a floating TV unit in the living room 3.7m wide by 2.25m high in UV high-gloss MDF with integrated warm 3000K LED profile channels and Blum soft-close hardware upgrade.',
  },
  {
    label: 'Modular Kitchen & Island',
    text: 'Client Dawit (+251 91 123 4567) at Bole Residence requested modular kitchen upper and base cabinetry 4.5m x 2.1m in moisture-resistant acrylic, plus 1 acoustic slatted oak dining feature wall 3.2m x 2.6m, and 3 bar stool sets at 9,500 ETB each. Apply 15% VAT.',
  },
  {
    label: 'Master Suite Wardrobe',
    text: 'Master bedroom remodel for Tigist: floor-to-ceiling sliding wardrobe 3.2m x 2.7m with internal LED strip lighting (6,000 ETB), plus 2 floating bedside nightstands at 11,500 ETB each.',
  },
];

export function AiScopeModal({
  isOpen,
  onClose,
  catalog,
  currency,
  onApplyScope,
}: AiScopeModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedScopeResponse | null>(null);

  if (!isOpen) return null;

  const handleExtract = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Paste a client message, site measurement note, or project brief first.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setExtracted(null);

    try {
      const response = await fetch('/api/ai/extract-scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          defaultCurrency: currency,
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
        throw new Error(data?.error || 'Unable to extract scope from request.');
      }

      setExtracted(data as ExtractedScopeResponse);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected extraction error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (mode: 'append' | 'replace') => {
    if (!extracted) return;
    const mappedItems: LineItemDraft[] = (extracted.items || []).map((item, idx) => ({
      id: generateSafeId('item'),
      sortOrder: idx,
      title: item.title || 'Custom Scope Item',
      specification: item.specification || '',
      pricingMode: item.pricingMode === 'unit' ? 'unit' : 'dimension',
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      quantity: Number(item.quantity) || 1,
      unitLabel: item.unitLabel || (item.pricingMode === 'unit' ? 'pcs' : 'm²'),
      unitPrice: Number(item.unitPrice) || 0,
      addons: (item.addons || []).slice(0, 10).map((a) => ({
        id: generateSafeId('addon'),
        name: a.name,
        price: Number(a.price) || 0,
      })),
    }));

    onApplyScope(mode, mappedItems, {
      clientName: extracted.clientName || undefined,
      clientPhone: extracted.clientPhone || undefined,
      clientAddress: extracted.clientAddress || undefined,
      projectTitle: extracted.projectTitle || undefined,
      taxRate:
        typeof extracted.taxRate === 'number' && extracted.taxRate >= 0
          ? extracted.taxRate
          : undefined,
    });
    setExtracted(null);
    setPrompt('');
    onClose();
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-scope-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <h2 id="ai-scope-title" className="text-base font-semibold text-slate-900">
              AI Scope Extraction
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="scope-prompt" className="text-sm font-medium text-slate-700">
                Unstructured Client Request or Site Notes
              </label>
              <span className="text-xs text-slate-500">
                Matches rates against your {catalog.length}-item catalog
              </span>
            </div>
            <textarea
              id="scope-prompt"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Paste WhatsApp/Telegram messages, dimensions (e.g. 3.54m x 3m laminated MDF), material specs, hardware add-ons, or VAT terms..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-700/20 focus:border-amber-700"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-slate-500">Sample briefs:</span>
              {SAMPLE_BRIEFS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setPrompt(sample.text)}
                  className="text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
            >
              {errorMsg}
            </div>
          )}

          {extracted && (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Extracted Line Items ({extracted.items?.length || 0})
                </h3>
                {extracted.summaryNotes && (
                  <p className="text-xs text-slate-500">{extracted.summaryNotes}</p>
                )}
              </div>

              {(extracted.clientName || extracted.projectTitle) && (
                <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                  {extracted.clientName && (
                    <span>
                      Client: <strong className="text-slate-900">{extracted.clientName}</strong>
                    </span>
                  )}
                  {extracted.clientPhone && (
                    <span className="font-mono">{extracted.clientPhone}</span>
                  )}
                  {extracted.projectTitle && <span>Project: {extracted.projectTitle}</span>}
                </div>
              )}

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                {(extracted.items || []).map((item, idx) => {
                  const qty =
                    item.pricingMode === 'dimension'
                      ? Math.round(item.width * item.height * 100) / 100
                      : item.quantity;
                  const addonSum = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0);
                  const total = qty * item.unitPrice + addonSum;
                  return (
                    <div key={idx} className="p-3 text-xs flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-slate-500">
                          {item.specification}
                          {item.pricingMode === 'dimension'
                            ? ` · ${item.width}m × ${item.height}m (${qty} ${item.unitLabel})`
                            : ` · ${qty} ${item.unitLabel}`}
                        </div>
                        {item.addons?.length > 0 && (
                          <div className="text-amber-800">
                            Add-ons: {item.addons.map((a) => `${a.name} (+${formatMoney(a.price, currency)})`).join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-right font-mono tabular-nums shrink-0">
                        <div className="font-semibold text-slate-900">
                          {formatMoney(total, currency)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          @ {formatMoney(item.unitPrice, currency)}/{item.unitLabel}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {extracted ? (
              <>
                <button
                  type="button"
                  onClick={() => handleConfirm('append')}
                  className="px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Append Items
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirm('replace')}
                  className="px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Replace Invoice Scope
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isLoading || !prompt.trim()}
                onClick={handleExtract}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing Scope...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extract Line Items</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
