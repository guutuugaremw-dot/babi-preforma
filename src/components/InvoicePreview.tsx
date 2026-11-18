import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { formatMoney, formatQty, formatReadableDate } from '../lib/calculations';
import {
  loadCleanSignatureDataUrl,
  STUDIO_SIGNATURE_PATH,
} from '../lib/signatureAsset';
import type {
  InvoiceCalculationSummary,
  ProformaInvoiceDraft,
  StudioSettings,
} from '../types/proforma';

interface InvoicePreviewProps {
  invoice: ProformaInvoiceDraft;
  summary: InvoiceCalculationSummary;
  studio: StudioSettings;
  onExportPdf: () => void;
  onPrint: () => void;
}

export function InvoicePreview({
  invoice,
  summary,
  studio,
  onExportPdf,
  onPrint,
}: InvoicePreviewProps) {
  const [logoError, setLogoError] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState(false);
  const brandInitial = (studio.brandName || 'B').trim().slice(0, 1).toUpperCase();

  useEffect(() => {
    let active = true;
    loadCleanSignatureDataUrl().then((res) => {
      if (active && res?.dataUrl) {
        setSignatureDataUrl(res.dataUrl);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Preview Toolbar */}
      <div className="no-print flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-900 text-white rounded-lg">
        <div className="flex items-center gap-2 text-xs text-zinc-300 truncate">
          <span className="font-medium text-white">Document Preview</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-amber-300">
            {invoice.referenceNumber}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-600 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Standardized Pro Forma Document Sheet */}
      <article className="print-only-container bg-white border border-slate-200 rounded-lg p-6 sm:p-9 text-slate-800 shadow-xs">
        {/* Studio Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#e2d2c3] pb-5 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-[74px] h-[74px] rounded-lg bg-[#21252b] border border-[#d4a373] p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
              {!logoError ? (
                <img
                  src="/assets/aistudio/image_97dc7301.png"
                  alt={`${studio.brandName || 'Babi'} Logo`}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-[#d4a373]">
                  {brandInitial}
                </span>
              )}
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold tracking-[0.12em] text-[#1a1d20]">
                {(studio.brandName || 'BABI').toUpperCase()}
              </div>
              <div className="text-[11px] font-bold tracking-[0.22em] text-[#8c7a6b] uppercase mt-0.5">
                {studio.tagline || 'INTERIOR DESIGN'}
              </div>
            </div>
          </div>

          <div className="sm:text-right text-xs text-slate-600 leading-relaxed space-y-0.5">
            {studio.location && (
              <div className="font-semibold text-[#1a1d20]">{studio.location}</div>
            )}
            {studio.phone && (
              <div className="font-mono tabular-nums font-bold text-[#1a1d20]">
                {studio.phone}
              </div>
            )}
            {studio.messagingNote && (
              <div className="text-[11px] text-emerald-700 font-semibold">
                {studio.messagingNote}
              </div>
            )}
            {studio.email && <div>{studio.email}</div>}
          </div>
        </div>

        {/* Client & Reference Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-xs pb-4 border-b border-dashed border-slate-300 mb-5">
          <div className="space-y-1">
            <div>
              <span className="text-slate-500">To: </span>
              <span className="font-bold text-slate-900 text-sm">
                {invoice.clientName || 'Valued Client'}
              </span>
            </div>
            {invoice.clientPhone && (
              <div>
                <span className="text-slate-500">Phone: </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {invoice.clientPhone}
                </span>
              </div>
            )}
            {(invoice.projectTitle || invoice.clientAddress) && (
              <div className="text-slate-600">
                {[invoice.projectTitle, invoice.clientAddress].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <div>
              <span className="text-slate-500">Reference: </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {invoice.referenceNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Issued: </span>
              <span className="font-semibold text-slate-900">
                {formatReadableDate(invoice.issueDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Valid Until: </span>
              <span className="font-semibold text-slate-900">
                {formatReadableDate(invoice.validUntil)}
              </span>
            </div>
          </div>
        </div>

        {/* Document Banner */}
        <div className="bg-[#fbf6f0] border border-[#e2d2c3] text-center py-2.5 px-4 rounded text-sm font-bold tracking-[0.28em] text-[#1a1d20] mb-6">
          PROFORMA INVOICE
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#1a1d20] text-white text-xs tracking-wide">
                <th className="py-2.5 px-2.5 text-center w-10 rounded-tl">#</th>
                <th className="py-2.5 px-3">Item &amp; Description</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Unit Price</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Qty</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap rounded-tr">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-xs sm:text-sm">
              {summary.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No line items added yet. Add an item or select products from the catalog.
                  </td>
                </tr>
              ) : (
                summary.items.map((item, idx) => (
                  <tr key={item.id} className="align-top">
                    <td className="py-3.5 px-2.5 text-center font-mono tabular-nums font-semibold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-[#1a1d20]">
                        {item.title || 'Untitled Item'}
                      </div>
                      <div className="mt-1 space-y-1 text-[11px] text-slate-600">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {item.specification && <span>{item.specification}</span>}
                          {item.specification && item.pricingMode === 'dimension' && (
                            <span aria-hidden="true">·</span>
                          )}
                          {item.pricingMode === 'dimension' && (
                            <span className="font-mono tabular-nums text-slate-700 font-medium">
                              {item.width}m × {item.height}m
                            </span>
                          )}
                        </div>
                        {item.addons.length > 0 && (
                          <ul className="space-y-0.5 text-[#78593c]">
                            {item.addons.map((addon) => (
                              <li key={addon.id} className="flex items-center justify-between gap-2">
                                <span>+ {addon.name}</span>
                                <span className="font-mono tabular-nums shrink-0">
                                  {formatMoney(addon.price, invoice.currency)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono tabular-nums font-semibold text-[#1a1d20] whitespace-nowrap">
                      {formatQty(item.effectiveQuantity)}
                      {item.unitLabel ? (
                        <span className="text-[11px] font-normal text-slate-500 ml-1">
                          {item.unitLabel}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums font-bold text-[#1a1d20] whitespace-nowrap">
                      {formatMoney(item.lineTotal, invoice.currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Block */}
        <div className="flex justify-end border-t border-[#e2d2c3] pt-4">
          <div className="w-full sm:w-80 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">
                {formatMoney(summary.subtotal, invoice.currency)}
              </span>
            </div>

            {invoice.taxRate > 0 && (
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Tax / VAT ({invoice.taxRate}%)</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(summary.taxAmount, invoice.currency)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t-2 border-[#b08968] text-base font-extrabold text-[#9a6b3b]">
              <span>Total</span>
              <span className="font-mono tabular-nums">
                {formatMoney(summary.grandTotal, invoice.currency)}
              </span>
            </div>

            {invoice.prepaymentPercent > 0 && (
              <>
                <div className="flex justify-between items-center bg-[#fbf6f0] border border-[#e2d2c3] rounded px-3 py-2 text-xs sm:text-sm font-bold text-[#1a1d20]">
                  <span>{invoice.prepaymentPercent}% Prepayment</span>
                  <span className="font-mono tabular-nums text-amber-900">
                    {formatMoney(summary.prepaymentAmount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-0.5">
                  <span>Balance Upon Completion</span>
                  <span className="font-mono tabular-nums font-medium">
                    {formatMoney(summary.balanceDue, invoice.currency)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment Terms */}
        {invoice.paymentTerms && (
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-[#1a1d20]">Payment Terms &amp; Validity</div>
            <p className="leading-relaxed">{invoice.paymentTerms}</p>
          </div>
        )}

        {/* Banking & Execution Footer */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-slate-600">
          <div className="space-y-0.5">
            <div className="font-bold text-[#1a1d20] mb-1">Bank Transfer Details</div>
            {(studio.bankLabel || studio.bankAccount) && (
              <div>
                {studio.bankLabel}:{' '}
                <strong className="font-mono tabular-nums text-[#1a1d20]">
                  {studio.bankAccount}
                </strong>
              </div>
            )}
            {(studio.mobileMoneyLabel || studio.mobileMoneyAccount) && (
              <div>
                {studio.mobileMoneyLabel}:{' '}
                <strong className="font-mono tabular-nums text-[#1a1d20]">
                  {studio.mobileMoneyAccount}
                </strong>
              </div>
            )}
          </div>
          <div className="sm:text-right space-y-0.5">
            <div className="font-bold text-[#1a1d20] mb-1">Project Execution</div>
            {studio.executionLocation && <div>Location: {studio.executionLocation}</div>}
            {studio.warrantyNote && <div>{studio.warrantyNote}</div>}
          </div>
        </div>

        {/* Authorized Signature */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="text-[11px] text-slate-500">
            <div>Prepared &amp; Approved By</div>
            <div className="font-semibold text-[#1a1d20] mt-0.5">
              {(studio.brandName || 'BABI').toUpperCase()} {studio.tagline || 'INTERIOR DESIGN'}
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            {!signatureError && (
              <div className="h-14 w-36 flex items-center sm:justify-end overflow-hidden mb-1">
                {signatureDataUrl ? (
                  <img
                    src={signatureDataUrl}
                    alt="Authorized Studio Signature"
                    className="max-h-14 w-auto object-contain"
                  />
                ) : (
                  <img
                    src={STUDIO_SIGNATURE_PATH}
                    alt="Authorized Studio Signature"
                    referrerPolicy="no-referrer"
                    onError={() => setSignatureError(true)}
                    className="max-h-14 w-auto object-contain"
                  />
                )}
              </div>
            )}
            <div className="w-44 border-t border-slate-300 pt-1 text-[11px] font-semibold text-[#1a1d20] sm:text-right">
              Authorized Signature
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-dashed border-[#e2d2c3] text-center text-xs font-semibold tracking-wider text-[#8c7a6b] uppercase">
          {studio.footerNote || 'Thank you for choosing Babi Interior Design'}
        </div>
      </article>
    </div>
  );
}
