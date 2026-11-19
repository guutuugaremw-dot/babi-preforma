import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  Check,
  Cloud,
  FilePlus2,
  Loader2,
  LogIn,
  LogOut,
  Save,
  Sparkles,
} from 'lucide-react';
import { AiScopeModal } from './components/AiScopeModal';
import { CatalogView } from './components/CatalogView';
import { ClientPortalView } from './components/ClientPortalView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InvoiceEditor } from './components/InvoiceEditor';
import { InvoicePreview } from './components/InvoicePreview';
import { SavedInvoicesView } from './components/SavedInvoicesView';
import { SignInPage } from './components/SignInPage';
import { StudioSettingsView } from './components/StudioSettingsView';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import {
  computeInvoiceTotals,
  generateReferenceNumber,
  generateSafeId,
} from './lib/calculations';
import {
  createBlankInvoice,
  createStarterInvoice,
  DEFAULT_CATALOG_MATERIALS,
  DEFAULT_STUDIO_SETTINGS,
} from './lib/defaults';
import { auth, googleProvider } from './lib/firebase';
import {
  deleteCatalogMaterial,
  deletePublicCatalogMaterial,
  deleteSavedInvoice,
  loadInvoiceItems,
  loadPublicStudioPortal,
  loadStudioSettings,
  publishPublicCatalogMaterial,
  publishPublicStudioProfile,
  saveCatalogMaterial,
  saveInvoiceWithItems,
  saveStudioSettings,
  subscribeCatalogMaterials,
  subscribeUserInvoices,
  updateInvoiceStatus,
} from './lib/firestoreService';
import {
  mongoDeleteCatalogItem,
  mongoDeleteInvoice,
  mongoListInvoices,
  mongoLoadInvoiceItems,
  mongoSaveCatalogItem,
  mongoSaveInvoice,
  mongoSaveSettings,
  mongoUpdateInvoiceStatus,
} from './lib/mongoService';
import { exportProformaPdf } from './lib/pdfExport';
import type {
  CatalogMaterial,
  InvoiceStatus,
  LineItemDraft,
  ProformaInvoiceDraft,
  SavedInvoiceRecord,
  StudioSettings,
} from './types/proforma';

const LS_SETTINGS_KEY = 'babi_studio_settings_v1';
const LS_CATALOG_KEY = 'babi_studio_catalog_v1';
const LS_INVOICES_KEY = 'babi_studio_local_invoices_v1';

interface LocalSavedEntry {
  record: SavedInvoiceRecord;
  items: LineItemDraft[];
}

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getInitialPortalParam(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const queryPortal = params.get('portal');
  if (queryPortal) return queryPortal;

  const path = window.location.pathname.replace(/\/+$/, '');
  if (path === '/portal') return '1';
  const match = path.match(/^\/portal\/([a-zA-Z0-9_-]+)$/);
  return match ? match[1] : null;
}

function WorkspaceApp() {
  const [portalParam, setPortalParam] = useState<string | null>(() =>
    getInitialPortalParam()
  );
  const isStandalonePortal = Boolean(portalParam);

  useEffect(() => {
    const handlePopState = () => {
      const next = getInitialPortalParam();
      setPortalParam(next);
      setActiveTab(next ? 'portal' : 'editor');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    isStandalonePortal ? 'portal' : 'editor'
  );
  const [mobilePane, setMobilePane] = useState<'edit' | 'preview'>('edit');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() =>
    readLocalStorage(LS_SETTINGS_KEY, DEFAULT_STUDIO_SETTINGS)
  );
  const [catalog, setCatalog] = useState<CatalogMaterial[]>(() =>
    readLocalStorage(LS_CATALOG_KEY, DEFAULT_CATALOG_MATERIALS)
  );
  const [portalLoading, setPortalLoading] = useState<boolean>(
    Boolean(portalParam && portalParam !== '1')
  );

  const starter = useMemo(() => createStarterInvoice(studioSettings), []);
  const [invoice, setInvoice] = useState<ProformaInvoiceDraft>(starter.invoice);
  const [items, setItems] = useState<LineItemDraft[]>(starter.items);

  const [savedInvoices, setSavedInvoices] = useState<SavedInvoiceRecord[]>(() =>
    readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []).map((e) => e.record)
  );
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const summary = useMemo(
    () => computeInvoiceTotals(invoice, items),
    [invoice, items]
  );

  // If opened as a public client portal (?portal=<studioId> or /portal), fetch exposed public studio catalog
  useEffect(() => {
    if (!portalParam) {
      setPortalLoading(false);
      return;
    }

    let active = true;
    const loadPortal = async () => {
      try {
        if (portalParam !== '1') {
          setPortalLoading(true);
          const res = await loadPublicStudioPortal(portalParam);
          if (!active) return;
          if (res.studio) setStudioSettings(res.studio);
          if (res.catalog.length > 0) {
            setCatalog(res.catalog);
            return;
          }
        } else {
          // For local preview (?portal=1 or /portal), preserve local studio edits if present
          const hasLocalCatalog = Boolean(localStorage.getItem(LS_CATALOG_KEY));
          if (hasLocalCatalog) return;
        }

        // Fetch public catalog from exposed API endpoint when no remote/local studio catalog is present
        const apiRes = await fetch('/api/public/catalog');
        if (!active || !apiRes.ok) return;
        const data = (await apiRes.json()) as {
          studio?: StudioSettings;
          catalog?: CatalogMaterial[];
        };
        if (!active) return;
        if (portalParam === '1' && data.studio && !localStorage.getItem(LS_SETTINGS_KEY)) {
          setStudioSettings(data.studio);
        }
        if (Array.isArray(data.catalog) && data.catalog.length > 0) {
          setCatalog(data.catalog);
        }
      } catch (err) {
        console.error('Failed to load public studio portal:', err);
      } finally {
        if (active) setPortalLoading(false);
      }
    };

    void loadPortal();
    return () => {
      active = false;
    };
  }, [portalParam]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Firestore subscriptions when authenticated (skipped in standalone client portal mode)
  useEffect(() => {
    if (!authReady || isStandalonePortal) return;
    if (!user) {
      const localEntries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
      setSavedInvoices(localEntries.map((e) => e.record));
      setStudioSettings(readLocalStorage(LS_SETTINGS_KEY, DEFAULT_STUDIO_SETTINGS));
      setCatalog(readLocalStorage(LS_CATALOG_KEY, DEFAULT_CATALOG_MATERIALS));
      setIsInvoicesLoading(false);
      return;
    }

    let cancelled = false;
    setIsInvoicesLoading(true);

    loadStudioSettings(user.uid)
      .then(async (remoteSettings) => {
        if (cancelled) return;
        if (remoteSettings) {
          setStudioSettings(remoteSettings);
          await publishPublicStudioProfile(user.uid, remoteSettings);
          void mongoSaveSettings(user, remoteSettings);
        } else {
          const personalizedDefaults = {
            ...studioSettings,
            email: user.email || studioSettings.email,
            brandName: user.displayName
              ? `${user.displayName.split(' ')[0]}'s Studio`
              : studioSettings.brandName,
          };
          setStudioSettings(personalizedDefaults);
          await saveStudioSettings(user.uid, personalizedDefaults);
          await publishPublicStudioProfile(user.uid, personalizedDefaults);
          void mongoSaveSettings(user, personalizedDefaults);
        }
      })
      .catch((err) => {
        console.error('Failed to load studio settings:', err);
      });

    const unsubInvoices = subscribeUserInvoices(user.uid, (records) => {
      if (cancelled) return;
      if (records.length > 0) {
        setSavedInvoices(records);
        setIsInvoicesLoading(false);
      } else {
        void mongoListInvoices(user).then((mongoRecords) => {
          if (cancelled) return;
          setSavedInvoices(mongoRecords && mongoRecords.length > 0 ? mongoRecords : records);
          setIsInvoicesLoading(false);
        });
      }
    });

    let seededCatalog = false;
    let syncedPublicCatalog = false;
    const unsubCatalog = subscribeCatalogMaterials(user.uid, async (remoteCatalog) => {
      if (cancelled) return;
      if (remoteCatalog.length === 0 && !seededCatalog) {
        seededCatalog = true;
        try {
          await Promise.all(
            DEFAULT_CATALOG_MATERIALS.map(async (item) => {
              await saveCatalogMaterial(user.uid, item);
              await publishPublicCatalogMaterial(user.uid, item);
              void mongoSaveCatalogItem(user, item);
            })
          );
        } catch (err) {
          console.error('Catalog seed failed:', err);
        }
      } else {
        setCatalog(remoteCatalog);
        if (!syncedPublicCatalog && remoteCatalog.length > 0) {
          syncedPublicCatalog = true;
          Promise.all(
            remoteCatalog.map((item) => {
              void mongoSaveCatalogItem(user, item);
              return publishPublicCatalogMaterial(user.uid, item);
            })
          ).catch((err) => {
            console.error('Public catalog sync failed:', err);
          });
        }
      }
    });

    return () => {
      cancelled = true;
      unsubInvoices();
      unsubCatalog();
    };
  }, [authReady, user, isStandalonePortal]);

  const showNotice = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast((curr) => (curr === msg ? null : curr));
    }, 2600);
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/unauthorized-domain') {
        const domain =
          typeof window !== 'undefined' ? window.location.hostname : 'current domain';
        setAuthError(
          `Domain "${domain}" is not authorized in Firebase Authentication. In Firebase Console > Authentication > Settings > Authorized Domains, add "${domain}".`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          'The Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError(
          'The sign-in window was closed before completion. Please click "Sign in with Google" again to select your account.'
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
        setAuthError(msg);
      }
    }
  };

  const handleOpenPublicPortalFromSignIn = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/portal');
    }
    setPortalParam('1');
    setActiveTab('portal');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsGuestMode(false);
    const fresh = createStarterInvoice(DEFAULT_STUDIO_SETTINGS);
    setInvoice(fresh.invoice);
    setItems(fresh.items);
    setSavedInvoices([]);
    setStudioSettings(DEFAULT_STUDIO_SETTINGS);
    setCatalog(DEFAULT_CATALOG_MATERIALS);
    setActiveTab('editor');
  };

  const handleSaveInvoice = async () => {
    setIsSaving(true);
    try {
      if (user) {
        await Promise.all([
          saveInvoiceWithItems(user.uid, invoice, items),
          mongoSaveInvoice(user, invoice, items),
        ]);
        showNotice('Saved to Cloud');
      } else {
        const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
        const record: SavedInvoiceRecord = {
          ...invoice,
          discountValue: 0,
          subtotal: summary.subtotal,
          discountAmount: 0,
          taxAmount: summary.taxAmount,
          grandTotal: summary.grandTotal,
          itemCount: items.length,
        };
        const idx = entries.findIndex((e) => e.record.id === invoice.id);
        if (idx >= 0) {
          entries[idx] = { record, items };
        } else {
          entries.unshift({ record, items });
        }
        localStorage.setItem(LS_INVOICES_KEY, JSON.stringify(entries));
        setSavedInvoices(entries.map((e) => e.record));
        showNotice('Saved Locally');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewDraft = () => {
    const blank = createBlankInvoice(studioSettings);
    setInvoice(blank.invoice);
    setItems(blank.items);
    setActiveTab('editor');
  };

  const handleOpenSavedInvoice = async (record: SavedInvoiceRecord) => {
    if (user) {
      let loadedItems = await loadInvoiceItems(user.uid, record.id);
      if (loadedItems.length === 0) {
        const mongoItems = await mongoLoadInvoiceItems(user, record.id);
        if (mongoItems && mongoItems.length > 0) loadedItems = mongoItems;
      }
      setInvoice(record);
      setItems(loadedItems);
    } else {
      const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
      const found = entries.find((e) => e.record.id === record.id);
      setInvoice(record);
      setItems(found ? found.items : []);
    }
    setActiveTab('editor');
  };

  const handleDuplicateInvoice = async (record: SavedInvoiceRecord) => {
    let sourceItems: LineItemDraft[] = [];
    if (user) {
      sourceItems = await loadInvoiceItems(user.uid, record.id);
      if (sourceItems.length === 0) {
        sourceItems = (await mongoLoadInvoiceItems(user, record.id)) || [];
      }
    } else {
      const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
      sourceItems = entries.find((e) => e.record.id === record.id)?.items || [];
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const validIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    setInvoice({
      ...record,
      id: generateSafeId('inv'),
      referenceNumber: generateReferenceNumber(studioSettings.invoicePrefix),
      status: 'draft',
      issueDate: todayIso,
      validUntil: validIso,
      discountValue: 0,
    });
    setItems(
      sourceItems.map((it, idx) => ({
        ...it,
        id: generateSafeId('item'),
        sortOrder: idx,
        addons: it.addons.map((a) => ({ ...a, id: generateSafeId('addon') })),
      }))
    );
    setActiveTab('editor');
    showNotice('Duplicated as New Draft');
  };

  const handleExportSavedPdf = async (record: SavedInvoiceRecord) => {
    let sourceItems: LineItemDraft[] = [];
    if (user) {
      sourceItems = await loadInvoiceItems(user.uid, record.id);
      if (sourceItems.length === 0) {
        sourceItems = (await mongoLoadInvoiceItems(user, record.id)) || [];
      }
    } else {
      const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
      sourceItems = entries.find((e) => e.record.id === record.id)?.items || [];
    }
    const calcSummary = computeInvoiceTotals(record, sourceItems);
    await exportProformaPdf(record, calcSummary, studioSettings);
  };

  const handleUpdateSavedStatus = async (invoiceId: string, status: InvoiceStatus) => {
    if (user) {
      await Promise.all([
        updateInvoiceStatus(user.uid, invoiceId, status),
        mongoUpdateInvoiceStatus(user, invoiceId, status),
      ]);
    } else {
      const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []);
      const updated = entries.map((e) =>
        e.record.id === invoiceId ? { ...e, record: { ...e.record, status } } : e
      );
      localStorage.setItem(LS_INVOICES_KEY, JSON.stringify(updated));
      setSavedInvoices(updated.map((e) => e.record));
    }
    if (invoice.id === invoiceId) {
      setInvoice((prev) => ({ ...prev, status }));
    }
  };

  const handleDeleteSavedInvoice = async (invoiceId: string) => {
    if (user) {
      await Promise.all([
        deleteSavedInvoice(user.uid, invoiceId),
        mongoDeleteInvoice(user, invoiceId),
      ]);
    } else {
      const entries = readLocalStorage<LocalSavedEntry[]>(LS_INVOICES_KEY, []).filter(
        (e) => e.record.id !== invoiceId
      );
      localStorage.setItem(LS_INVOICES_KEY, JSON.stringify(entries));
      setSavedInvoices(entries.map((e) => e.record));
    }
  };

  const handleSaveCatalogMaterial = async (item: CatalogMaterial) => {
    if (user) {
      await Promise.all([
        saveCatalogMaterial(user.uid, item),
        publishPublicCatalogMaterial(user.uid, item),
        mongoSaveCatalogItem(user, item),
      ]);
    } else {
      const next = [...catalog.filter((c) => c.id !== item.id), item];
      setCatalog(next);
      localStorage.setItem(LS_CATALOG_KEY, JSON.stringify(next));
    }
  };

  const handleDeleteCatalogMaterial = async (id: string) => {
    if (user) {
      await Promise.all([
        deleteCatalogMaterial(user.uid, id),
        deletePublicCatalogMaterial(user.uid, id),
        mongoDeleteCatalogItem(user, id),
      ]);
    } else {
      const next = catalog.filter((c) => c.id !== id);
      setCatalog(next);
      localStorage.setItem(LS_CATALOG_KEY, JSON.stringify(next));
    }
  };

  const handleInsertCatalogToInvoice = (mat: CatalogMaterial) => {
    const newItem: LineItemDraft = {
      id: generateSafeId('item'),
      sortOrder: items.length,
      title: mat.title,
      specification: mat.specification,
      pricingMode: mat.pricingMode,
      width: mat.defaultWidth || 2.0,
      height: mat.defaultHeight || 2.0,
      quantity:
        mat.pricingMode === 'dimension'
          ? Math.round((mat.defaultWidth || 2) * (mat.defaultHeight || 2) * 100) / 100
          : 1,
      unitLabel: mat.unitLabel,
      unitPrice: mat.unitPrice,
      addons: [],
    };
    setItems((prev) => [...prev, newItem]);
    setActiveTab('editor');
    showNotice(`Added ${mat.title}`);
  };

  const handleSaveStudioSettings = async (next: StudioSettings) => {
    setStudioSettings(next);
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(next));
    if (user) {
      await Promise.all([
        saveStudioSettings(user.uid, next),
        publishPublicStudioProfile(user.uid, next),
        mongoSaveSettings(user, next),
      ]);
    }
    showNotice('Studio Settings Updated');
  };

  const handleApplyAiScope = (
    mode: 'append' | 'replace',
    extractedItems: LineItemDraft[],
    meta: {
      clientName?: string;
      clientPhone?: string;
      clientAddress?: string;
      projectTitle?: string;
      taxRate?: number;
    }
  ) => {
    setInvoice((prev) => ({
      ...prev,
      clientName: meta.clientName || prev.clientName,
      clientPhone: meta.clientPhone || prev.clientPhone,
      clientAddress: meta.clientAddress || prev.clientAddress,
      projectTitle: meta.projectTitle || prev.projectTitle,
      taxRate: typeof meta.taxRate === 'number' ? meta.taxRate : prev.taxRate,
    }));

    if (mode === 'replace') {
      setItems(extractedItems.map((it, idx) => ({ ...it, sortOrder: idx })));
    } else {
      setItems((prev) => [
        ...prev,
        ...extractedItems.map((it, idx) => ({ ...it, sortOrder: prev.length + idx })),
      ]);
    }
    showNotice(`Applied ${extractedItems.length} AI items`);
  };

  const portalShareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return user
      ? `${window.location.origin}/portal/${user.uid}`
      : `${window.location.origin}/portal`;
  }, [user]);

  const portalExportRef = useRef<(() => void) | null>(null);
  const handleRegisterPortalExport = useCallback((fn: () => void) => {
    portalExportRef.current = fn;
  }, []);

  const handleTopBarExport = () => {
    if (activeTab === 'portal' && portalExportRef.current) {
      portalExportRef.current();
      return;
    }
    void exportProformaPdf(invoice, summary, studioSettings);
  };

  if (!isStandalonePortal && !authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
          <span>Verifying your session...</span>
        </div>
      </div>
    );
  }

  if (!isStandalonePortal && !user && !isGuestMode) {
    return (
      <SignInPage
        onSignInWithGoogle={handleSignIn}
        onOpenPublicPortal={handleOpenPublicPortalFromSignIn}
        onContinueAsGuest={() => setIsGuestMode(true)}
        authError={authError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onExportPdf={handleTopBarExport}
        portalStandalone={isStandalonePortal}
        brandName={studioSettings.brandName}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'editor' && (
          <div className="space-y-5">
            {/* Workspace Toolbar */}
            <div className="no-print bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>AI Extract Scope</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saveToast ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{saveToast || 'Save Pro Forma'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateNewDraft}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  <span>New Draft</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Mobile Edit/Preview switcher */}
                <div className="lg:hidden flex items-center p-0.5 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setMobilePane('edit')}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      mobilePane === 'edit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Edit Scope
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane('preview')}
                    className={`px-3 py-1 text-xs font-medium rounded-md cursor-pointer ${
                      mobilePane === 'preview'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Preview PDF
                  </button>
                </div>

                {/* Auth / Cloud Sync Control */}
                {user ? (
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="truncate max-w-[160px]">
                        {user.displayName || user.email}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 underline cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in to Sync</span>
                  </button>
                )}
              </div>
            </div>

            {authError && (
              <div className="no-print rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
                {authError}
              </div>
            )}

            {/* Split Workspace: Editor + Live Standardized Pro Forma Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div
                className={`no-print lg:col-span-6 ${
                  mobilePane === 'edit' ? 'block' : 'hidden lg:block'
                }`}
              >
                <InvoiceEditor
                  invoice={invoice}
                  items={items}
                  summary={summary}
                  catalog={catalog}
                  invoicePrefix={studioSettings.invoicePrefix}
                  onChangeInvoice={(patch) =>
                    setInvoice((prev) => ({ ...prev, ...patch }))
                  }
                  onChangeItems={setItems}
                />
              </div>

              <div
                className={`lg:col-span-6 lg:sticky lg:top-20 ${
                  mobilePane === 'preview' ? 'block' : 'hidden lg:block'
                }`}
              >
                <InvoicePreview
                  invoice={invoice}
                  summary={summary}
                  studio={studioSettings}
                  onExportPdf={() =>
                    exportProformaPdf(invoice, summary, studioSettings)
                  }
                  onPrint={() => window.print()}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portal' &&
          (portalLoading ? (
            <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading studio catalog...</span>
            </div>
          ) : (
            <ClientPortalView
              studio={studioSettings}
              catalog={catalog}
              isStandalone={isStandalonePortal}
              portalShareUrl={portalShareUrl}
              onRegisterExport={handleRegisterPortalExport}
              onImportToEditor={(nextInvoice, nextItems) => {
                setInvoice(nextInvoice);
                setItems(nextItems);
                setActiveTab('editor');
                showNotice('Imported from Client Portal');
              }}
            />
          ))}

        {activeTab === 'invoices' && (
          <SavedInvoicesView
            invoices={savedInvoices}
            isLoading={isInvoicesLoading}
            isSignedIn={Boolean(user)}
            userEmail={user?.email}
            onSignIn={handleSignIn}
            onOpenInvoice={handleOpenSavedInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
            onExportInvoicePdf={handleExportSavedPdf}
            onUpdateStatus={handleUpdateSavedStatus}
            onDeleteInvoice={handleDeleteSavedInvoice}
            onCreateNew={handleCreateNewDraft}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            catalog={catalog}
            defaultCurrency={studioSettings.defaultCurrency}
            portalShareUrl={portalShareUrl}
            isSignedIn={Boolean(user)}
            onSaveMaterial={handleSaveCatalogMaterial}
            onDeleteMaterial={handleDeleteCatalogMaterial}
            onInsertToInvoice={handleInsertCatalogToInvoice}
            onOpenPortal={() => setActiveTab('portal')}
          />
        )}

        {activeTab === 'settings' && (
          <StudioSettingsView
            settings={studioSettings}
            onSaveSettings={handleSaveStudioSettings}
          />
        )}
      </main>

      <AiScopeModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        catalog={catalog}
        currency={invoice.currency}
        onApplyScope={handleApplyAiScope}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}
