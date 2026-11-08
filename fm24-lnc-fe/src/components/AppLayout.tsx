'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import AppSidebar from './AppSidebar';
import AppHeader from './AppHeader';
import RecordModal from './RecordModal';
import QuickSearchModal from './QuickSearchModal';
import SettingsModal from './SettingsModal';
import { AppContextProvider } from '../context/AppContext';
import { reimportLnc, getExportUrl, fetchContinents } from '../services/api';
import { RecordType, EntityType } from '../types';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [totalContinents, setTotalContinents] = useState(0);

  // Global modals state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalType, setRecordModalType] = useState<RecordType | EntityType | string>(RecordType.CLUB);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [defaultNationId, setDefaultNationId] = useState<string | number | undefined>(undefined);
  const [defaultCompId, setDefaultCompId] = useState<string | number | undefined>(undefined);

  // Header display state
  const [currentHeaderTitle, setCurrentHeaderTitle] = useState('Confederations & Nations');
  const [currentHeaderId, setCurrentHeaderId] = useState<string | number | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [backHref, setBackHref] = useState<string | (() => void) | null>(null);
  const [headerLogo, setHeaderLogo] = useState<any | null>(null);

  // Global refresh trigger signal
  const [refreshSignal, setRefreshSignal] = useState(0);
  const triggerRefresh = useCallback(() => {
    setRefreshSignal((prev) => prev + 1);
  }, []);

  useEffect(() => {
    fetchContinents(refreshSignal > 0)
      .then((data: any) => {
        const count = Array.isArray(data) ? data.length : data?.content?.length || 0;
        setTotalContinents(count);
      })
      .catch(() => {});
  }, [refreshSignal]);

  const handleSyncLnc = useCallback(async () => {
    if (confirm('Do you want to re-sync the database from original .LNC files?')) {
      setIsSyncing(true);
      const hide = message.loading('Scanning and importing data...', 0);
      try {
        await reimportLnc();
        hide();
        message.success('Database synced successfully!');
        triggerRefresh();
      } catch (e: any) {
        hide();
        message.error(e.message || 'Sync failed');
      } finally {
        setIsSyncing(false);
      }
    }
  }, [triggerRefresh]);

  const handleExportLnc = useCallback(() => {
    window.open(getExportUrl(), '_blank');
    message.success('Downloading updated .LNC file...');
  }, []);

  // Global shortcut listeners:
  // - Search: Ctrl+K / Cmd+K
  // - Sync .LNC: Alt+S or Ctrl+Shift+S
  // - Export .LNC: Alt+E or Ctrl+Shift+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
        return;
      }

      // Sync .LNC: Alt+S or Ctrl+Shift+S
      if (
        (e.altKey && e.key.toLowerCase() === 's') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's')
      ) {
        e.preventDefault();
        handleSyncLnc();
        return;
      }

      // Export .LNC: Alt+E or Ctrl+Shift+E
      if (
        (e.altKey && e.key.toLowerCase() === 'e') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e')
      ) {
        e.preventDefault();
        handleExportLnc();
        return;
      }

      // Settings: Ctrl+, or Cmd+,
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSyncLnc, handleExportLnc]);

  const handleOpenRecordModal = useCallback(
    (type: RecordType | EntityType | string, initialData?: any, natId?: string | number, cId?: string | number) => {
      setRecordModalType(type);
      setEditingRecord(initialData || null);
      setDefaultNationId(natId);
      setDefaultCompId(cId);
      setIsRecordModalOpen(true);
    },
    [],
  );

  return (
    <AppContextProvider
      headerTitle={currentHeaderTitle}
      setHeaderTitle={setCurrentHeaderTitle}
      headerId={currentHeaderId}
      setHeaderId={setCurrentHeaderId}
      breadcrumbs={breadcrumbs}
      setBreadcrumbs={setBreadcrumbs}
      backHref={backHref}
      setBackHref={setBackHref}
      headerLogo={headerLogo}
      setHeaderLogo={setHeaderLogo}
      onOpenRecordModal={handleOpenRecordModal}
      onOpenSearchModal={() => setIsSearchModalOpen(true)}
      refreshSignal={refreshSignal}
      triggerRefresh={triggerRefresh}
    >
      <div className="relative flex h-full w-full bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
        {/* Sidebar: full-height on the left (persistent on desktop, drawer on mobile) */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onOpenSearchModal={() => setIsSearchModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSync={handleSyncLnc}
          onExport={handleExportLnc}
          totalContinents={totalContinents}
        />

        {/* Right column: Header on top, Main content below */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden">
          <AppHeader
            collapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            onOpenSearchModal={() => setIsSearchModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSync={handleSyncLnc}
            isSyncing={isSyncing}
            onExport={handleExportLnc}
            onQuickAdd={(type) => handleOpenRecordModal(type)}
            onRefresh={triggerRefresh}
            currentStepTitle={currentHeaderTitle}
            currentStepId={currentHeaderId}
            breadcrumbs={breadcrumbs}
            backHref={backHref}
            headerLogo={headerLogo}
          />

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-100/70 overflow-hidden">
            {children}
          </main>
        </div>

        {/* Global Modals */}
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          onSuccess={() => {
            message.success('Record saved successfully!');
            triggerRefresh();
          }}
          type={recordModalType}
          initialData={editingRecord}
          defaultNationId={defaultNationId}
          defaultCompId={defaultCompId}
        />

        <QuickSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          onSelectItem={(item, type) => {
            if (type === EntityType.NATION) {
              router.push(`/?nationId=${item.id}&nationName=${encodeURIComponent(item.name_lg || item.name || '')}`);
            } else if (type === EntityType.COMPETITION) {
              router.push(
                `/?compId=${item.id}&compName=${encodeURIComponent(item.name_sh || item.name_lg || item.name || '')}`,
              );
            } else if (type === EntityType.CLUB) {
              router.push(`/club/${item.id}`);
            } else {
              handleOpenRecordModal(type as RecordType, item);
            }
          }}
        />

        <SettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefreshData={triggerRefresh}
        />
      </div>
    </AppContextProvider>
  );
}
