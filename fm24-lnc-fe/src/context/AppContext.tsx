'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { RecordType, EntityType } from '../types';

export interface BreadcrumbStep {
  title: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface HeaderLogoInfo {
  url: string;
  alt?: string;
  isFlag?: boolean;
}

interface AppContextType {
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
  headerId: string | number | undefined;
  setHeaderId: (id: string | number | undefined) => void;
  breadcrumbs: BreadcrumbStep[];
  setBreadcrumbs: (crumbs: BreadcrumbStep[]) => void;
  backHref: string | (() => void) | null;
  setBackHref: (href: string | (() => void) | null) => void;
  headerLogo: HeaderLogoInfo | null;
  setHeaderLogo: (logo: HeaderLogoInfo | null) => void;
  openRecordModal: (
    type: RecordType | EntityType | string,
    initialData?: any,
    defaultNationId?: string | number,
    defaultCompId?: string | number,
  ) => void;
  openSearchModal: () => void;
  refreshSignal: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({
  children,
  headerTitle,
  setHeaderTitle,
  headerId,
  setHeaderId,
  breadcrumbs = [],
  setBreadcrumbs = () => {},
  backHref = null,
  setBackHref = () => {},
  headerLogo = null,
  setHeaderLogo = () => {},
  onOpenRecordModal,
  onOpenSearchModal,
  refreshSignal,
  triggerRefresh,
}: {
  children: ReactNode;
  headerTitle: string;
  setHeaderTitle: (title: string) => void;
  headerId: string | number | undefined;
  setHeaderId: (id: string | number | undefined) => void;
  breadcrumbs?: BreadcrumbStep[];
  setBreadcrumbs?: (crumbs: BreadcrumbStep[]) => void;
  backHref?: string | (() => void) | null;
  setBackHref?: (href: string | (() => void) | null) => void;
  headerLogo?: HeaderLogoInfo | null;
  setHeaderLogo?: (logo: HeaderLogoInfo | null) => void;
  onOpenRecordModal: (
    type: RecordType | EntityType | string,
    initialData?: any,
    defaultNationId?: string | number,
    defaultCompId?: string | number,
  ) => void;
  onOpenSearchModal: () => void;
  refreshSignal: number;
  triggerRefresh: () => void;
}) {
  return (
    <AppContext.Provider
      value={{
        headerTitle,
        setHeaderTitle,
        headerId,
        setHeaderId,
        breadcrumbs,
        setBreadcrumbs,
        backHref,
        setBackHref,
        headerLogo,
        setHeaderLogo,
        openRecordModal: onOpenRecordModal,
        openSearchModal: onOpenSearchModal,
        refreshSignal,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppContextProvider');
  }
  return ctx;
}
