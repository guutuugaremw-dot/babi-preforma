import { Download } from 'lucide-react';

export type WorkspaceTab = 'editor' | 'portal' | 'invoices' | 'catalog' | 'settings';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onExportPdf: () => void;
  portalStandalone?: boolean;
  brandName?: string;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: 'editor', label: 'Editor' },
  { id: 'portal', label: 'Client Portal' },
  { id: 'invoices', label: 'Saved Invoices' },
  { id: 'catalog', label: 'Material Catalog' },
  { id: 'settings', label: 'Studio Settings' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onExportPdf,
  portalStandalone = false,
  brandName,
}: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab(portalStandalone ? 'portal' : 'editor')}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          {portalStandalone ? `${brandName || 'Babi'} Client Portal` : 'Babi Pro Forma'}
        </button>

        {/* Zone 2: Clean single-line text navigation links */}
        {!portalStandalone ? (
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
                    isActive
                      ? 'border-amber-700 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <div />
        )}

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Mobile secondary navigation row (only on < md viewports and non-standalone) */}
      {!portalStandalone && (
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`text-xs font-medium py-1 border-b-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-amber-700 text-slate-900'
                    : 'border-transparent text-slate-500'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
