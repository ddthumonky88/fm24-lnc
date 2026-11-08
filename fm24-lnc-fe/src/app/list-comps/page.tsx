'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { CompIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchCompetitionsList, fetchUnitTree, findNationInTree, CompetitionItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';

const CONFEDERATIONS = [
  { label: '🌍 All Confederations / Global', value: 'all' },
  { label: '🇪🇺 UEFA (Europe)', value: 'UEFA' },
  { label: '🌏 AFC (Asia)', value: 'AFC' },
  { label: '🌍 CAF (Africa)', value: 'CAF' },
  { label: '🌎 CONCACAF (North, Central America & Caribbean)', value: 'CONCACAF' },
  { label: '🌎 CONMEBOL (South America)', value: 'CONMEBOL' },
  { label: '🌏 OFC (Oceania)', value: 'OFC' },
  { label: '🌐 WORLD (International)', value: 'WORLD' },
];

function ListCompsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialScope = searchParams.get('scope') || 'all';
  const initialConfed = searchParams.get('confedId') || 'all';

  const [scope, setScope] = useState<'all' | 'domestic' | 'international'>(initialScope as any);
  const [selectedConfed, setSelectedConfed] = useState<string>(initialConfed);
  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempScope, setTempScope] = useState<'all' | 'domestic' | 'international'>(initialScope as any);
  const [tempConfed, setTempConfed] = useState<string>(initialConfed);
  const [tempNation, setTempNation] = useState<string>(initialNationId);

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('comp')
      .then((nodes) => {
        if (Array.isArray(nodes)) {
          setTreeNodes(nodes);
        }
      })
      .catch(() => {});
  }, []);

  // Sync query params if they change
  useEffect(() => {
    const qNation = searchParams.get('nationId');
    if (qNation) {
      setSelectedNation(qNation);
      setTempNation(qNation);
    }
    const qScope = searchParams.get('scope');
    if (qScope) {
      setScope(qScope as any);
      setTempScope(qScope as any);
    }
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
    setHeaderTitle('Competitions');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Competitions' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [scope, selectedConfed, selectedNation, page]);

  const loadCompetitions = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      const res = await fetchCompetitionsList(
        {
          scope,
          confedId: selectedConfed === 'all' ? undefined : selectedConfed,
          nationId: selectedNation === 'all' ? undefined : selectedNation,
          page: page - 1,
          size: pageSize,
          keyword: debouncedKeyword,
        },
        refreshSignal > 0,
      );

      const rawItems = Array.isArray(res) ? res : (res as any)?.content || [];
      const items = rawItems.filter((c: any) => {
        const id = String(c.id || '').toUpperCase();
        const type = String(c.virtual_type || c.type || '').toUpperCase();
        return (
          !id.startsWith('OTH-') &&
          !id.startsWith('EXT-') &&
          id !== '[OTHER]' &&
          id !== '[EXTINCT]' &&
          type !== 'OTHER' &&
          type !== 'EXTINCT'
        );
      });
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setCompetitions(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load competitions');
    } finally {
      setLoading(false);
    }
  }, [scope, selectedConfed, selectedNation, page, pageSize, pageSizeReady, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadCompetitions();
  }, [loadCompetitions]);

  // Filter summary: cấp 1 > cấp 2
  const levels: string[] = [];
  if (selectedConfed === 'WORLD') {
    levels.push('WORLD');
  } else if (scope === 'international') {
    if (selectedConfed !== 'all') {
      levels.push(selectedConfed);
    }
    levels.push('International');
  } else if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    let confed = selectedConfed !== 'all' ? selectedConfed : (nationNode?.confed || '');
    if (confed) levels.push(confed);
    const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
    levels.push(nationName);
  } else if (selectedConfed !== 'all') {
    levels.push(selectedConfed);
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'All competitions';
  const hasActiveCustomFilter = scope !== 'all' || selectedConfed !== 'all' || selectedNation !== 'all';

  const handleOpenModal = () => {
    setTempScope(scope);
    setTempConfed(selectedConfed);
    setTempNation(selectedNation);
    setModalOpen(true);
  };

  const handleSelectTreeNode = (key: string, nodeData?: any) => {
    const lk = key.toLowerCase();
    const confedKeys = ['afc', 'caf', 'concacaf', 'conmebol', 'ofc', 'uefa'];
    if (lk === 'all') {
      setTempScope('all');
      setTempConfed('all');
      setTempNation('all');
    } else if (lk === 'confed_world' || lk === 'world') {
      setTempScope('international');
      setTempConfed('WORLD');
      setTempNation('all');
    } else if (lk.startsWith('intl_')) {
      const confedCode = key.replace(/^intl_/i, '').toUpperCase();
      setTempScope('international');
      setTempConfed(confedCode);
      setTempNation('all');
    } else if (key.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = key.replace('confed_', '').toUpperCase();
      setTempScope('all');
      setTempConfed(confedCode);
      setTempNation('all');
    } else {
      let confedCode = nodeData?.confed || 'all';
      if (confedCode === 'all' && nodeData?.nationData) {
        const nation = nodeData.nationData;
        if (typeof nation.confed === 'string') confedCode = nation.confed.toUpperCase();
        else if (nation.confed?.code) confedCode = nation.confed.code.toUpperCase();
      }
      if (confedCode === 'all') {
        const nationNode = findNationInTree(treeNodes, key);
        if (nationNode?.confed) confedCode = nationNode.confed.toUpperCase();
      }
      setTempScope('domestic');
      setTempConfed(confedCode);
      setTempNation(key);
    }
  };

  const currentTreeSelectedKey =
    selectedNation !== 'all'
      ? selectedNation
      : selectedConfed === 'WORLD'
      ? 'world'
      : scope === 'international' && selectedConfed !== 'all'
      ? `intl_${selectedConfed.toLowerCase()}`
      : selectedConfed !== 'all'
      ? selectedConfed.toLowerCase()
      : 'all';

  const applyFilterDirectly = (key: string, nodeData?: any) => {
    const lk = key.toLowerCase();
    const confedKeys = ['afc', 'caf', 'concacaf', 'conmebol', 'ofc', 'uefa'];
    if (lk === 'all') {
      setScope('all');
      setSelectedConfed('all');
      setSelectedNation('all');
    } else if (lk === 'confed_world' || lk === 'world') {
      setScope('international');
      setSelectedConfed('WORLD');
      setSelectedNation('all');
    } else if (lk.startsWith('intl_')) {
      const confedCode = key.replace(/^intl_/i, '').toUpperCase();
      setScope('international');
      setSelectedConfed(confedCode);
      setSelectedNation('all');
    } else if (key.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = key.replace('confed_', '').toUpperCase();
      setScope('all');
      setSelectedConfed(confedCode);
      setSelectedNation('all');
    } else {
      let confedCode = nodeData?.confed || 'all';
      if (confedCode === 'all' && nodeData?.nationData) {
        const nation = nodeData.nationData;
        if (typeof nation.confed === 'string') confedCode = nation.confed.toUpperCase();
        else if (nation.confed?.code) confedCode = nation.confed.code.toUpperCase();
      }
      if (confedCode === 'all') {
        const nationNode = findNationInTree(treeNodes, key);
        if (nationNode?.confed) confedCode = nationNode.confed.toUpperCase();
      }
      setScope('domestic');
      setSelectedConfed(confedCode);
      setSelectedNation(key);
    }
    setPage(1);
  };

  const handleResetModal = () => {
    setTempScope('all');
    setTempConfed('all');
    setTempNation('all');
  };

  const handleApplyModal = () => {
    setScope(tempScope);
    setSelectedConfed(tempConfed);
    setSelectedNation(tempNation);
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
            <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xs">
              <CompIcon size={14} />
            </span>
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Unit Tree
            </span>
          </div>
          <button
            type="button"
            onClick={() => applyFilterDirectly('all')}
            className="text-[11px] font-medium text-slate-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Filter Body: UnitTree chiếm trọn chiều cao */}
        <div className="flex-1 min-h-0 h-full p-2.5 flex flex-col overflow-hidden">
          <UnitTree
            mode="comp"
            height="100%"
            selectedKey={currentTreeSelectedKey}
            onSelectNode={(key, node) => applyFilterDirectly(key, node)}
            allOptionLabel="All Confederations / Global"
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
              pageIcon={<CompIcon size={20} />}
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
            items={competitions}
            type={EntityType.COMPETITION}
            loading={loading}
            containerRef={listContainerRef}
            cardSize="large"
            largeStyle="2-line"
            cardStyle="2-line"
            onNavigate={(record) => {
              if (record?.id) {
                router.push(`/comp/${record.id}`);
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
            emptyText="No matching competitions found"
          />
        </div>
      </div>

      {/* 3. Modal bộ lọc Giải đấu */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <CompIcon size={16} />
            </span>
            <span>Competition Filter</span>
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
            mode="comp"
            allowSelectConfed={true}
            selectedKey={
              tempNation !== 'all'
                ? tempNation
                : tempConfed === 'WORLD'
                ? 'world'
                : tempScope === 'international' && tempConfed !== 'all'
                ? `intl_${tempConfed.toLowerCase()}`
                : tempConfed !== 'all'
                ? tempConfed.toLowerCase()
                : 'all'
            }
            onSelectNode={handleSelectTreeNode}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListCompsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading competitions...</div>}>
      <ListCompsContent />
    </Suspense>
  );
}
