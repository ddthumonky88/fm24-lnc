'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { NationIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchNationsByContinent, NationItem } from '../../services/api';
import { EntityType } from '../../types';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';

interface ConfedOption {
  value: string;
  code: string;
  icon: string;
}

const CONFEDERATIONS: ConfedOption[] = [
  { value: 'all', code: 'All confederations', icon: '🌍' },
  { value: 'UEFA', code: 'UEFA', icon: '🌍' },
  { value: 'AFC', code: 'AFC', icon: '🌏' },
  { value: 'CAF', code: 'CAF', icon: '🌍' },
  { value: 'CONCACAF', code: 'CONCACAF', icon: '🌎' },
  { value: 'CONMEBOL', code: 'CONMEBOL', icon: '🌎' },
  { value: 'OFC', code: 'OFC', icon: '🌏' },
  { value: 'EXTINCT', code: 'EXTINCT', icon: '🏛️' },
];

function ListNationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialConfed = searchParams.get('confedId') || 'all';

  const [selectedConfed, setSelectedConfed] = useState<string>(initialConfed);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempConfed, setTempConfed] = useState<string>(initialConfed);

  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [nations, setNations] = useState<NationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync confedId from searchParams
  useEffect(() => {
    const qConfed = searchParams.get('confedId');
    if (qConfed) {
      setSelectedConfed(qConfed);
      setTempConfed(qConfed);
    }
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Set AppHeader
  useEffect(() => {
    setHeaderTitle('Nations');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Nations' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on confed or page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedConfed, page]);

  const loadNations = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      const res = await fetchNationsByContinent(
        selectedConfed === 'all' ? null : selectedConfed,
        {
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );

      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setNations(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load nations');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, page, pageSize, pageSizeReady, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadNations();
  }, [loadNations]);

  const currentConfedObj =
    CONFEDERATIONS.find((c) => c.value.toLowerCase() === selectedConfed.toLowerCase()) ||
    CONFEDERATIONS[0];
  const filterSummary = currentConfedObj.code;

  const handleOpenModal = () => {
    setTempConfed(selectedConfed);
    setModalOpen(true);
  };

  // Chọn option trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handlePickConfed = (val: string) => {
    setTempConfed(val === 'all' ? 'all' : val.toUpperCase());
  };

  const handleResetModal = () => {
    setTempConfed('all');
  };

  const handleApplyModal = () => {
    setSelectedConfed(tempConfed);
    setPage(1);
    setModalOpen(false);
  };

  return (
    <div className="h-full w-full flex min-h-0 bg-slate-100/70 p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
      {/* 1. KHU VỰC FILTER: Khung đóng viền riêng biệt bên trái */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 xl:w-80 shrink-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden h-full">
        {/* Filter Header */}
        <div className="h-12 px-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-xs">
              <NationIcon size={14} />
            </span>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Unit Tree
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedConfed('all');
              setPage(1);
            }}
            className="text-[11px] font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Filter Body: UnitTree chiếm trọn chiều cao */}
        <div className="flex-1 min-h-0 h-full p-2.5 flex flex-col overflow-hidden">
          <UnitTree
            mode="nation"
            confedOnly
            height="100%"
            selectedKey={selectedConfed}
            onSelectNode={(val) => {
              setSelectedConfed(val === 'all' ? 'all' : val.toUpperCase());
              setPage(1);
            }}
            allOptionLabel="All Confederations"
          />
        </div>
      </aside>

      {/* 2. KHU VỰC BÊN PHẢI: Search + Vùng Danh Sách */}
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col gap-3 overflow-hidden">
        {/* Khung Search trên cùng */}
        <div className="shrink-0 flex-none bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs">
          <Input
            size="middle"
            placeholder="Search..."
            allowClear
            prefix={<SearchOutlined className="text-slate-400 text-lg mr-2" />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full text-sm bg-slate-50/80 hover:bg-white focus:bg-white rounded-xl border border-slate-200 hover:border-blue-400 focus:border-blue-500 py-1 px-3 shadow-2xs transition-colors"
          />

          {/* Mobile Filter Bar (Chỉ hiển thị trên mobile < md) */}
          <div className="md:hidden mt-2">
            <ListPageFilterBar
              pageIcon={<NationIcon size={20} />}
              iconBoxClassName="bg-blue-50 text-blue-600 border-blue-200/80"
              filterSummary={filterSummary}
              hasActiveCustomFilter={selectedConfed !== 'all'}
              onClick={handleOpenModal}
            />
          </div>
        </div>

        {/* Khung Vùng danh sách bên dưới */}
        <div className="flex-1 min-h-0 h-full bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <CardGrid
            items={nations}
            type={EntityType.NATION}
            loading={loading}
            containerRef={listContainerRef}
            onNavigate={(record) => {
              if (record?.id) {
                router.push(`/nation/${record.id}`);
              }
            }}
            serverPagination={{
              current: page,
              pageSize,
              total,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
            emptyText="No matching nations found"
          />
        </div>
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <NationIcon size={16} />
            </span>
            <span>Unit Tree</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="reset" icon={<ReloadOutlined />} onClick={handleResetModal}>
            Reset
          </Button>,
          <Button key="close" onClick={() => setModalOpen(false)}>
            Close
          </Button>,
          <Button key="apply" type="primary" onClick={handleApplyModal}>
            Apply
          </Button>,
        ]}
        width={480}
        centered
        destroyOnHidden
      >
        <div className="py-1">
          <UnitTree
            mode="nation"
            confedOnly
            selectedKey={tempConfed}
            onSelectNode={(val) => handlePickConfed(val)}
            allOptionLabel="All Confederations"
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListNationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading nations...</div>}>
      <ListNationsContent />
    </Suspense>
  );
}
