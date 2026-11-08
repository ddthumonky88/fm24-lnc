'use client';

import React, { useState, useEffect } from 'react';
import { Empty } from 'antd';
import EntityCard from './EntityCard';
import AppPagination from './AppPagination';
import { EntityTypeValue } from '../types';

export interface CardGridProps {
  items: any[];
  type: EntityTypeValue;
  loading?: boolean;
  cardSize?: 'small' | 'large';
  largeStyle?: '1-line' | '2-line';
  cardStyle?: '1-line' | '2-line';
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
  emptyText?: string;
  defaultPageSize?: number;
  columns?: number;
  serverPagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function CardGrid({
  items,
  type,
  loading,
  cardSize,
  largeStyle,
  cardStyle,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
  emptyText = 'No records found',
  defaultPageSize = 20,
  columns,
  serverPagination,
  containerRef,
}: CardGridProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const internalScrollRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = containerRef || internalScrollRef;

  const isServer = Boolean(serverPagination);
  const totalRecords = isServer ? serverPagination!.total : items.length;
  const currentPageSize = isServer ? serverPagination!.pageSize : pageSize;
  const maxPage = Math.max(1, Math.ceil(totalRecords / currentPageSize));
  const currentPage = isServer ? serverPagination!.current : Math.min(page, maxPage);

  // Scroll to top on page change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentPage, scrollRef]);

  // Keep page within valid bounds when items or pageSize changes (client mode)
  useEffect(() => {
    if (!serverPagination) {
      if (items.length === 0) {
        setPage(1);
      } else {
        const maxP = Math.max(1, Math.ceil(items.length / pageSize));
        if (page > maxP) {
          setPage(maxP);
        }
      }
    }
  }, [items.length, pageSize, serverPagination, page]);

  // Reset page to 1 when type changes
  useEffect(() => {
    if (!serverPagination) {
      setPage(1);
    }
  }, [type, serverPagination]);

  useEffect(() => {
    if (!serverPagination) {
      setPageSize(defaultPageSize);
    }
  }, [defaultPageSize, serverPagination]);

  if (loading) {
    return (
      <div className="h-full flex-1 flex flex-col items-center justify-center py-16 text-sm text-gray-500 gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading cards...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full flex-1 flex items-center justify-center p-6">
        <div className="py-12 px-8 bg-white rounded-xl border border-gray-100 shadow-2xs max-w-md w-full text-center">
          <Empty description={emptyText} />
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * currentPageSize;
  const pagedItems = isServer ? items : items.slice(startIndex, startIndex + currentPageSize);
  const showingStart = totalRecords === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + pagedItems.length, totalRecords);

  const entityTypeStr = String(type).toLowerCase();
  const isSmall =
    cardSize !== undefined
      ? cardSize === 'small'
      : columns === 2
        ? true
        : entityTypeStr === 'nation' ||
          entityTypeStr === 'stadium' ||
          entityTypeStr === 'city';

  const gridClasses = isSmall
    ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5';

  return (
    <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
      {/* Scrollable Cards Grid Area */}
      <div
        ref={scrollRef as any}
        className="flex-1 min-h-0 overflow-y-auto px-3.5 sm:px-5 py-3 sm:py-4 scrollbar-thin"
      >
        <div className={gridClasses}>
          {pagedItems.map((item) => (
            <EntityCard
              key={item.id}
              type={type}
              data={item}
              cardSize={isSmall ? 'small' : 'large'}
              largeStyle={largeStyle || cardStyle}
              onNavigate={onNavigate}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewChildren={onViewChildren}
            />
          ))}
        </div>
      </div>

      {/* Fixed Bottom Pagination Bar (Pinned) */}
      {totalRecords > 0 && (
        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-t border-slate-200/90 bg-white shadow-2xs z-10 gap-1.5 sm:gap-3">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left shrink-0">
            Showing <strong className="text-slate-700">{showingStart}</strong> - <strong className="text-slate-700">{showingEnd}</strong> / <strong className="text-blue-600">{totalRecords.toLocaleString()}</strong> records
          </div>
          <div className="flex items-center justify-center sm:justify-end max-w-full overflow-x-auto">
            <AppPagination
              current={currentPage}
              pageSize={currentPageSize}
              total={totalRecords}
              showSizeChanger={true}
              pageSizeOptions={[10, 24, 60]}
              onChange={(p, s) => {
                if (isServer) {
                  serverPagination!.onChange(p, s);
                } else {
                  setPage(p);
                  setPageSize(s);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
