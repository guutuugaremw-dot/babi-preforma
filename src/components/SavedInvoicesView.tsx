import { useMemo, useState } from 'react';
import { Copy, Download, FilePlus2, FolderOpen, Search, Trash2 } from 'lucide-react';
import { formatMoney, formatReadableDate } from '../lib/calculations';
import type { InvoiceStatus, SavedInvoiceRecord } from '../types/proforma';

interface SavedInvoicesViewProps {
  invoices: SavedInvoiceRecord[];
  isLoading: boolean;
  isSignedIn: boolean;
  userEmail?: string | null;
  onSignIn: () => void;
  onOpenInvoice: (record: SavedInvoiceRecord) => void;
  onDuplicateInvoice: (record: SavedInvoiceRecord) => void;
  onExportInvoicePdf: (record: SavedInvoiceRecord) => void;
  onUpdateStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onCreateNew: () => void;
}

const FILTER_TABS: { id: 'all' | InvoiceStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'approved', label: 'Approved' },
  { id: 'archived', label: 'Archived' },
];

const STATUS_TEXT_CLASS: Record<InvoiceStatus, string> = {
  draft: 'text-amber-700',
  sent: 'text-sky-700',
  approved: 'text-emerald-700',
  archived: 'text-slate-500',
};

export function SavedInvoicesView({
  invoices,
  isLoading,
  isSignedIn,
  userEmail,
  onSignIn,
  onOpenInvoice,
  onDuplicateInvoice,
  onExportInvoicePdf,
  onUpdateStatus,
  onDeleteInvoice,
  onCreateNew,
}: SavedInvoicesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.referenceNumber.toLowerCase().includes(q) ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.projectTitle.toLowerCase().includes(q)
      );
    });
  }, [invoices, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Personal Saved Pro Formas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSignedIn
              ? `Securely stored in your cloud account${userEmail ? ` (${userEmail})` : ''}.`
              : 'Sign in to store and sync your personal pro formas across sessions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isSignedIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign in with Google
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FilePlus2 className="w-3.5 h-3.5" />
            <span>New Pro Forma</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, client, project..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-700/20"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 px-4 flex items-center justify-between animate-pulse">
                <div className="h-3 w-48 bg-slate-100 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              {invoices.length === 0
                ? 'No saved pro forma invoices yet.'
                : 'No invoices match your search or filter.'}
            </p>
            <p className="text-xs text-slate-500">
              Save any draft from the Editor to track client quotes, status, and reference numbers.
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Create Pro Forma</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4">Client &amp; Project</th>
                  <th className="py-2.5 px-4">Issued</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Items</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((record) => (
                  <tr key={record.id} className="h-11 hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {record.referenceNumber}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">
                        {record.clientName || 'Unnamed Client'}
                      </div>
                      {record.projectTitle && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {record.projectTitle}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {formatReadableDate(record.issueDate)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <select
                        aria-label={`Status for ${record.referenceNumber}`}
                        value={record.status}
                        onChange={(e) =>
                          onUpdateStatus(record.id, e.target.value as InvoiceStatus)
                        }
                        className={`text-xs font-semibold bg-transparent border border-slate-200 rounded px-2 py-1 cursor-pointer ${
                          STATUS_TEXT_CLASS[record.status]
                        }`}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="approved">Approved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                      {record.itemCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {formatMoney(record.grandTotal, record.currency)}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(record)}
                          title="Open in Editor"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateInvoice(record)}
                          title="Duplicate as new draft"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExportInvoicePdf(record)}
                          title="Download PDF"
                          className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteInvoice(record.id)}
                          title="Delete invoice"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
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
        )}
      </div>
    </div>
  );
}
