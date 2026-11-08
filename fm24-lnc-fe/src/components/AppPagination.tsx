'use client';

import React from 'react';
import { Select } from 'antd';
import {
  DoubleLeftOutlined,
  LeftOutlined,
  RightOutlined,
  DoubleRightOutlined,
} from '@ant-design/icons';

export interface AppPaginationProps {
  current: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
  pageSizeOptions?: number[];
  showSizeChanger?: boolean;
  className?: string;
}

export default function AppPagination({
  current,
  pageSize,
  total,
  onChange,
  pageSizeOptions = [10, 24, 60],
  showSizeChanger = true,
  className = '',
}: AppPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // --- 1. Mobile (3 pages in the middle) ---
  let startMobile = 1;
  let endMobile = totalPages;
  if (totalPages > 3) {
    startMobile = Math.max(1, current - 1);
    endMobile = startMobile + 2;
    if (endMobile > totalPages) {
      endMobile = totalPages;
      startMobile = Math.max(1, endMobile - 2);
    }
  }
  const pagesMobile: number[] = [];
  for (let i = startMobile; i <= endMobile; i++) {
    pagesMobile.push(i);
  }
  const hasLeftDotsMobile = startMobile > 1;
  const hasRightDotsMobile = endMobile < totalPages;

  // --- 2. Desktop (5 pages in the middle) ---
  let startDesktop = 1;
  let endDesktop = totalPages;
  if (totalPages > 5) {
    startDesktop = Math.max(1, current - 2);
    endDesktop = startDesktop + 4;
    if (endDesktop > totalPages) {
      endDesktop = totalPages;
      startDesktop = Math.max(1, endDesktop - 4);
    }
  }
  const pagesDesktop: number[] = [];
  for (let i = startDesktop; i <= endDesktop; i++) {
    pagesDesktop.push(i);
  }
  const hasLeftDotsDesktop = startDesktop > 1;
  const hasRightDotsDesktop = endDesktop < totalPages;

  const goToPage = (p: number) => {
    const target = Math.max(1, Math.min(totalPages, p));
    if (target !== current) {
      onChange(target, pageSize);
    }
  };

  const navBtnBase =
    'h-7 min-w-7 sm:h-8 sm:min-w-8 px-1.5 sm:px-2 rounded-md border flex items-center justify-center transition-all select-none text-xs';
  const navBtnActive =
    'bg-white border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-slate-50 cursor-pointer shadow-2xs active:scale-95';
  const navBtnDisabled = 'bg-slate-50/60 border-slate-100 text-slate-300 cursor-not-allowed';

  return (
    <div className={`select-none ${className}`}>
      {/* ============================================================== */}
      {/* MOBILE VIEW (< sm): << + < + ... + 3 trang + ... + > + >>      */}
      {/* ============================================================== */}
      <div className="flex sm:hidden items-center gap-1">
        {/* << First Page */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => goToPage(1)}
          title="First page (1)"
          className={`${navBtnBase} ${current <= 1 ? navBtnDisabled : navBtnActive}`}
        >
          <DoubleLeftOutlined className="text-[10px]" />
        </button>

        {/* < Prev Page */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => goToPage(current - 1)}
          title="Previous page"
          className={`${navBtnBase} ${current <= 1 ? navBtnDisabled : navBtnActive}`}
        >
          <LeftOutlined className="text-[10px]" />
        </button>

        {/* ... Left Dots */}
        {hasLeftDotsMobile && (
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, current - 3))}
            title="Jump 3 pages back"
            className="h-7 min-w-5 px-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs font-bold tracking-widest flex items-center justify-center"
          >
            •••
          </button>
        )}

        {/* 3 trang (Mobile: 3 page buttons) */}
        {pagesMobile.map((p) => {
          const isActive = p === current;
          return (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              className={`h-7 min-w-7 px-1.5 rounded-md border text-xs transition-all cursor-pointer font-medium select-none ${
                isActive
                  ? 'bg-blue-50 border-blue-400 text-blue-600 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* ... Right Dots */}
        {hasRightDotsMobile && (
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, current + 3))}
            title="Jump 3 pages forward"
            className="h-7 min-w-5 px-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs font-bold tracking-widest flex items-center justify-center"
          >
            •••
          </button>
        )}

        {/* > Next Page */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => goToPage(current + 1)}
          title="Next page"
          className={`${navBtnBase} ${current >= totalPages ? navBtnDisabled : navBtnActive}`}
        >
          <RightOutlined className="text-[10px]" />
        </button>

        {/* >> Last Page */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => goToPage(totalPages)}
          title={`Last page (${totalPages})`}
          className={`${navBtnBase} ${current >= totalPages ? navBtnDisabled : navBtnActive}`}
        >
          <DoubleRightOutlined className="text-[10px]" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP VIEW (>= sm): << + < + ... + 5 trang + ... + > + >>    */}
      {/* ============================================================== */}
      <div className="hidden sm:flex items-center gap-1.5">
        {/* << First Page */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => goToPage(1)}
          title="First page (1)"
          className={`${navBtnBase} ${current <= 1 ? navBtnDisabled : navBtnActive}`}
        >
          <DoubleLeftOutlined className="text-[10px]" />
        </button>

        {/* < Prev Page */}
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => goToPage(current - 1)}
          title="Previous page"
          className={`${navBtnBase} ${current <= 1 ? navBtnDisabled : navBtnActive}`}
        >
          <LeftOutlined className="text-[10px]" />
        </button>

        {/* ... Left Dots */}
        {hasLeftDotsDesktop && (
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, current - 5))}
            title="Jump 5 pages back"
            className="h-8 min-w-6 px-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs font-bold tracking-widest flex items-center justify-center"
          >
            •••
          </button>
        )}

        {/* 5 trang (Desktop: 5 page buttons) */}
        {pagesDesktop.map((p) => {
          const isActive = p === current;
          return (
            <button
              key={p}
              type="button"
              onClick={() => goToPage(p)}
              className={`h-8 min-w-8 px-2 rounded-md border text-xs transition-all cursor-pointer font-medium select-none ${
                isActive
                  ? 'bg-blue-50 border-blue-400 text-blue-600 font-bold shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          );
        })}

        {/* ... Right Dots */}
        {hasRightDotsDesktop && (
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, current + 5))}
            title="Jump 5 pages forward"
            className="h-8 min-w-6 px-0.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs font-bold tracking-widest flex items-center justify-center"
          >
            •••
          </button>
        )}

        {/* > Next Page */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => goToPage(current + 1)}
          title="Next page"
          className={`${navBtnBase} ${current >= totalPages ? navBtnDisabled : navBtnActive}`}
        >
          <RightOutlined className="text-[10px]" />
        </button>

        {/* >> Last Page */}
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => goToPage(totalPages)}
          title={`Last page (${totalPages})`}
          className={`${navBtnBase} ${current >= totalPages ? navBtnDisabled : navBtnActive}`}
        >
          <DoubleRightOutlined className="text-[10px]" />
        </button>

        {/* Page Size Changer (desktop only) */}
        {showSizeChanger && (
          <div className="inline-flex items-center ml-1.5">
            <Select
              size="small"
              value={pageSize}
              onChange={(newSize) => onChange(1, newSize)}
              options={pageSizeOptions.map((s) => ({
                value: s,
                label: `${s} / page`,
              }))}
              className="w-24 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
