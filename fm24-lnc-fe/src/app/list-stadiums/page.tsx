'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { StadiumIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchStadiums, fetchUnitTree, findNationInTree, StadiumItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';

function ListStadiumsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';

  const [selectedConfed, setSelectedConfed] = useState<string>('all');
  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempConfed, setTempConfed] = useState<string>('all');
  const [tempNation, setTempNation] = useState<string>(initialNationId);

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');

  const [stadiums, setStadiums] = useState<StadiumItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('stadium')
      .then((nodes) => {
        if (Array.isArray(nodes)) {
          setTreeNodes(nodes);
        }
      })
      .catch(() => {});
  }, []);

  // Sync if query param changes
  useEffect(() => {
    const qNation = searchParams.get('nationId');
    if (qNation) {
      setSelectedNation(qNation);
      setTempNation(qNation);
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
    setHeaderTitle('Stadiums');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Stadiums' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, page]);

  const loadData = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      const natParam = selectedNation === 'all' ? null : selectedNation;
      const res = await fetchStadiums(
        natParam,
        {
          confedId: selectedConfed !== 'all' ? selectedConfed : undefined,
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );
      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setStadiums(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load stadiums');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, selectedNation, page, pageSize, pageSizeReady, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  let filterSummary = 'All stadiums';
  if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    if (nationNode) {
      const levels: string[] = [];
      const confed = selectedConfed !== 'all' ? selectedConfed : nationNode.confed;
      if (confed) levels.push(confed);
      const name = nationNode.shortName || nationNode.title || selectedNation;
      levels.push(name);
      filterSummary = levels.join(' > ');
    } else {
      filterSummary = selectedNation;
    }
  } else if (selectedConfed !== 'all') {
    filterSummary = selectedConfed;
  }

  const hasActiveCustomFilter = selectedConfed !== 'all' || selectedNation !== 'all';

  const handleOpenModal = () => {
    setTempConfed(selectedConfed);
    setTempNation(selectedNation);
    setModalOpen(true);
  };

  const confedKeys = ['afc', 'caf', 'concacaf', 'conmebol', 'ofc', 'uefa'];

  // Chọn option trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handlePickNation = (val: string) => {
    const lk = val.toLowerCase();
    if (val === 'all') {
      setTempConfed('all');
      setTempNation('all');
    } else if (val.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = val.replace('confed_', '').toUpperCase();
      setTempConfed(confedCode);
      setTempNation('all');
    } else {
      setTempNation(val);
      const nationNode = findNationInTree(treeNodes, val);
      if (nationNode?.confed) setTempConfed(nationNode.confed);
    }
  };

  const handleSelectDirectly = (val: string) => {
    const lk = val.toLowerCase();
    if (val === 'all') {
      setSelectedConfed('all');
      setSelectedNation('all');
    } else if (val.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = val.replace('confed_', '').toUpperCase();
      setSelectedConfed(confedCode);
      setSelectedNation('all');
    } else {
      setSelectedNation(val);
      const nationNode = findNationInTree(treeNodes, val);
      if (nationNode?.confed) setSelectedConfed(nationNode.confed);
    }
    setPage(1);
  };

  const handleResetModal = () => {
    setTempConfed('all');
    setTempNation('all');
  };

  const handleApplyModal = () => {
    setSelectedConfed(tempConfed);
    setSelectedNation(tempNation);
    setPage(1);
    setModalOpen(false);
  };

  const currentTreeSelectedKey =
    selectedNation !== 'all'
      ? selectedNation
      : selectedConfed !== 'all'
      ? selectedConfed.toLowerCase()
      : 'all';

  return (
    <div className="h-full w-full flex min-h-0 bg-slate-100/70 p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden">
      {/* 1. KHU VỰC FILTER: Khung đóng viền riêng biệt bên trái */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 xl:w-80 shrink-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden h-full">
        {/* Filter Header */}
        <div className="h-12 px-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xs">
              <StadiumIcon size={14} />
            </span>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Unit Tree
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedNation('all');
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
            mode="stadium"
            height="100%"
            selectedKey={currentTreeSelectedKey}
            onSelectNode={handleSelectDirectly}
            allOptionLabel="All Stadiums"
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
              pageIcon={<StadiumIcon size={20} />}
              iconBoxClassName="bg-amber-50 text-amber-600 border-amber-200/80"
              filterSummary={filterSummary}
              hasActiveCustomFilter={hasActiveCustomFilter}
              onClick={handleOpenModal}
            />
          </div>
        </div>

        {/* Khung Vùng danh sách bên dưới */}
        <div className="flex-1 min-h-0 h-full bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <CardGrid
            items={stadiums}
            type={EntityType.STADIUM}
            loading={loading}
            containerRef={listContainerRef}
            onNavigate={(record) => {
              if (record?.id) {
                router.push(`/stadium/${record.id}`);
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
            emptyText="No matching stadiums found"
          />
        </div>
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <StadiumIcon size={16} />
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
            mode="stadium"
            selectedKey={tempNation !== 'all' ? tempNation : tempConfed !== 'all' ? tempConfed.toLowerCase() : 'all'}
            onSelectNode={(val) => handlePickNation(val)}
            allOptionLabel="All Nations"
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListStadiumsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading stadiums...</div>}>
      <ListStadiumsContent />
    </Suspense>
  );
}
