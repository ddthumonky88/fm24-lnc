'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Dropdown, Tooltip, type MenuProps } from 'antd';
import {
  MenuOutlined,
  SyncOutlined,
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
  FlagOutlined,
  DownOutlined,
  SettingOutlined,
} from '@ant-design/icons';

import { RecordType } from '../types';
import { CompIcon, ClubIcon, StadiumIcon, CityIcon, AwardIcon } from './EntityIcons';
import { BreadcrumbStep, HeaderLogoInfo } from '../context/AppContext';

export { RecordType };
export type QuickAddType = RecordType;

interface AppHeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onToggleMobileMenu: () => void;
  onOpenSearchModal: () => void;
  onOpenSettings?: () => void;
  onSync: () => void;
  isSyncing?: boolean;
  onExport: () => void;
  onQuickAdd: (type: QuickAddType) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  currentStepTitle?: string;
  currentStepId?: string | number;
  breadcrumbs?: BreadcrumbStep[];
  backHref?: string | (() => void) | null;
  headerLogo?: HeaderLogoInfo | null;
}

export default function AppHeader({
  collapsed,
  onToggleSidebar,
  onToggleMobileMenu,
  onOpenSearchModal,
  onOpenSettings,
  onSync,
  isSyncing = false,
  onExport,
  onQuickAdd,
  onRefresh,
  isRefreshing = false,
  currentStepTitle,
  currentStepId,
  breadcrumbs,
  backHref,
  headerLogo,
}: AppHeaderProps) {
  const router = useRouter();

  const effectiveBreadcrumbs: BreadcrumbStep[] = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) {
      return breadcrumbs;
    }
    if (
      currentStepTitle &&
      currentStepTitle !== 'FM' &&
      currentStepTitle !== 'HOME' &&
      currentStepTitle !== 'Confederations & Nations'
    ) {
      return [{ title: 'FM', href: '/' }, { title: currentStepTitle }];
    }
    return [];
  }, [breadcrumbs, currentStepTitle]);

  // Quick Add Dropdown Menu items
  const quickAddItems: MenuProps['items'] = [
    {
      key: RecordType.CLUB,
      icon: <ClubIcon size={16} className="text-blue-500" />,
      label: 'Add Club',
      onClick: () => onQuickAdd(RecordType.CLUB),
    },
    {
      key: RecordType.COMPETITION,
      icon: <CompIcon size={16} className="text-amber-500" />,
      label: 'Add Competition',
      onClick: () => onQuickAdd(RecordType.COMPETITION),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.CITY,
      icon: <CityIcon size={16} className="text-sky-500" />,
      label: 'Add City',
      onClick: () => onQuickAdd(RecordType.CITY),
    },
    {
      key: RecordType.STADIUM,
      icon: <StadiumIcon size={16} className="text-emerald-500" />,
      label: 'Add Stadium',
      onClick: () => onQuickAdd(RecordType.STADIUM),
    },
    {
      key: RecordType.AWARD,
      icon: <AwardIcon size={16} className="text-yellow-500" />,
      label: 'Add Award',
      onClick: () => onQuickAdd(RecordType.AWARD),
    },
    {
      type: 'divider',
    },
    {
      key: RecordType.PLAYER,
      icon: <UserOutlined className="text-sky-500" />,
      label: 'Add Person',
      onClick: () => onQuickAdd(RecordType.PLAYER),
    },
  ];

  // Combined Header Action Items (Export, Sync, Refresh, Quick Add)
  const actionMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <DownloadOutlined className="text-blue-600 text-sm" />,
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">Export .LNC</span>
            <span className="text-[11px] text-slate-400">Write names to FM24 files</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Alt+E
          </kbd>
        </div>
      ),
      onClick: onExport,
    },
    {
      key: 'sync',
      icon: (
        <SyncOutlined
          spin={isSyncing}
          className={isSyncing ? 'text-blue-600 text-sm' : 'text-slate-600 text-sm'}
        />
      ),
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">Sync .LNC</span>
            <span className="text-[11px] text-slate-400">Sync database with source</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Alt+S
          </kbd>
        </div>
      ),
      disabled: isSyncing,
      onClick: onSync,
    },
    {
      type: 'divider',
    },
    {
      key: 'refresh',
      icon: (
        <ReloadOutlined
          className={isRefreshing ? 'animate-spin text-blue-600 text-sm' : 'text-slate-600 text-sm'}
        />
      ),
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-medium text-slate-700 text-xs sm:text-sm">Refresh View</span>
            <span className="text-[11px] text-slate-400">Reload current page data</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">F5</span>
        </div>
      ),
      disabled: isRefreshing,
      onClick: onRefresh,
    },
    {
      type: 'divider',
    },
    {
      key: 'quick-add',
      icon: <PlusOutlined className="text-emerald-600 text-sm" />,
      label: (
        <div className="py-0.5">
          <span className="font-medium text-slate-700 text-xs sm:text-sm">Quick Add Record...</span>
        </div>
      ),
      children: quickAddItems,
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined className="text-slate-600 text-sm" />,
      label: (
        <div className="flex items-center justify-between gap-6 py-1 min-w-[190px]">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
              Cấu hình thư mục
            </span>
            <span className="text-[11px] text-slate-400">File .LNC & thư mục logo</span>
          </div>
          <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
            Ctrl+,
          </kbd>
        </div>
      ),
      onClick: onOpenSettings,
    },
  ];

  return (
    <header className="shrink-0 flex-none sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs transition-all">
      {/* Main Header Row */}
      <div className="h-14 px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Section: Mobile/Desktop Toggle & Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hamburger / Collapse Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                onToggleSidebar();
              } else {
                onToggleMobileMenu();
              }
            }}
            className="flex items-center justify-center w-8 h-8 rounded text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle Navigation"
            title="Toggle Menu (Sidebar)"
          >
            <MenuOutlined className="text-base" />
          </button>

          {/* Inline breadcrumbs next to the hamburger */}
          {effectiveBreadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-tight min-w-0 overflow-hidden">
              {effectiveBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === effectiveBreadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span className="text-[#1d70b8] font-bold select-none px-0.5">&gt;</span>
                    )}
                    {isLast ? (
                      <span className="font-bold text-[#0f3b6c] whitespace-nowrap">
                        {crumb.title}
                      </span>
                    ) : crumb.href ? (
                      <a
                        onClick={() => router.push(crumb.href!)}
                        className="text-[#1d70b8] hover:underline font-bold cursor-pointer whitespace-nowrap"
                      >
                        {crumb.title}
                      </a>
                    ) : crumb.onClick ? (
                      <a
                        onClick={crumb.onClick}
                        className="text-[#1d70b8] hover:underline font-bold cursor-pointer whitespace-nowrap"
                      >
                        {crumb.title}
                      </a>
                    ) : (
                      <span className="text-[#1d70b8] font-bold whitespace-nowrap">
                        {crumb.title}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Section: Actions Dropdown + Settings Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenSettings && (
            <Tooltip title="Cấu hình Thư mục Dữ liệu & Ảnh (Ctrl+,)">
              <Button
                icon={<SettingOutlined className="text-slate-600 text-sm" />}
                onClick={onOpenSettings}
                className="h-8 w-8 px-0 border-slate-200 hover:border-blue-400 hover:text-blue-600 shadow-2xs cursor-pointer flex items-center justify-center"
              />
            </Tooltip>
          )}

          <Dropdown menu={{ items: actionMenuItems }} placement="bottomRight" trigger={['click']}>
            <Tooltip title="FM24 Menu (Export, Sync, Quick Add...)">
              <button
                type="button"
                className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-500 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center p-0.5 bg-white shrink-0 group active:scale-95"
                aria-label="FM24 Menu"
              >
                <img
                  src="/fm/icons/icon-192.png"
                  alt="FM24"
                  className={`w-full h-full object-contain rounded-md group-hover:scale-105 transition-transform ${
                    isSyncing || isRefreshing ? 'animate-spin' : ''
                  }`}
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('/icons/icon-192.png')) {
                      e.currentTarget.src = '/icons/icon-192.png';
                    }
                  }}
                />
              </button>
            </Tooltip>
          </Dropdown>
        </div>
      </div>

    </header>
  );
}
