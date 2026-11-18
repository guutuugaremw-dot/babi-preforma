import { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import type { CurrencyCode, StudioSettings } from '../types/proforma';

interface StudioSettingsViewProps {
  settings: StudioSettings;
  onSaveSettings: (next: StudioSettings) => Promise<void> | void;
}

const CURRENCIES: CurrencyCode[] = ['ETB', 'USD', 'EUR', 'GBP'];

export function StudioSettingsView({
  settings,
  onSaveSettings,
}: StudioSettingsViewProps) {
  const [form, setForm] = useState<StudioSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Studio Branding &amp; Payment Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize your header contact details, banking accounts, warranty notes, and invoice defaults.
          </p>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {savedNotice ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Settings Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
          Brand &amp; Contact Header
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name</label>
            <input
              type="text"
              required
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">City / Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Messaging Note
            </label>
            <input
              type="text"
              value={form.messagingNote}
              onChange={(e) => setForm({ ...form, messagingNote: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
          Banking &amp; Execution Details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Bank Name</label>
            <input
              type="text"
              value={form.bankLabel}
              onChange={(e) => setForm({ ...form, bankLabel: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Bank Account Number
            </label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mobile Money Provider / Name
            </label>
            <input
              type="text"
              value={form.mobileMoneyLabel}
              onChange={(e) => setForm({ ...form, mobileMoneyLabel: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Mobile Money Number
            </label>
            <input
              type="text"
              value={form.mobileMoneyAccount}
              onChange={(e) => setForm({ ...form, mobileMoneyAccount: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Workshop / Execution Region
            </label>
            <input
              type="text"
              value={form.executionLocation}
              onChange={(e) => setForm({ ...form, executionLocation: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Warranty Note</label>
            <input
              type="text"
              value={form.warrantyNote}
              onChange={(e) => setForm({ ...form, warrantyNote: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Document Footer Message
            </label>
            <input
              type="text"
              value={form.footerNote}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2.5">
          Calculation &amp; Numbering Defaults
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Default Currency
            </label>
            <select
              value={form.defaultCurrency}
              onChange={(e) =>
                setForm({ ...form, defaultCurrency: e.target.value as CurrencyCode })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono bg-white text-slate-900"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reference Prefix
            </label>
            <input
              type="text"
              value={form.invoicePrefix}
              onChange={(e) =>
                setForm({
                  ...form,
                  invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Default Tax (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={form.defaultTaxRate}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultTaxRate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Prepayment (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={form.defaultPrepaymentPercent}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultPrepaymentPercent: Math.min(
                    100,
                    Math.max(0, parseFloat(e.target.value) || 0)
                  ),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900"
            />
          </div>
        </div>
      </section>
    </form>
  );
}
