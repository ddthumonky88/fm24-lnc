'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, Tag, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { AwardIcon } from '../../components/EntityIcons';
import ListPageFilterBar from '../../components/ListPageFilterBar';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { fetchAwards, fetchAwardsInComp, fetchUnitTree, findNationInTree, AwardItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';

function ListAwardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialCompId = searchParams.get('compId') || undefined;

  const [selectedConfed, setSelectedConfed] = useState<string>('all');
  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);
  const [selectedCompId, setSelectedCompId] = useState<string | undefined>(initialCompId);

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempConfed, setTempConfed] = useState<string>('all');
  const [tempNation, setTempNation] = useState<string>(initialNationId);
  const [tempCompId, setTempCompId] = useState<string | undefined>(initialCompId);

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>('');
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('award')
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
    const qComp = searchParams.get('compId');
    if (qComp) {
      setSelectedCompId(qComp);
      setTempCompId(qComp);
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
    setHeaderTitle('Awards');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Awards' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, selectedCompId, page]);

  const loadAwards = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      let res: any;
      if (selectedCompId) {
        res = await fetchAwardsInComp(
          selectedCompId,
          {
            page: page - 1,
            size: pageSize,
            keyword: debouncedKeyword,
          },
          refreshSignal > 0,
        );
      } else {
        res = await fetchAwards(
          selectedNation === 'all' ? null : selectedNation,
          {
            confedId: selectedConfed !== 'all' ? selectedConfed : undefined,
            page: page - 1,
            size: pageSize,
            keyword: debouncedKeyword,
          },
          refreshSignal > 0,
        );
      }

      const items = Array.isArray(res) ? res : (res as any)?.content || [];
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setAwards(items);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load awards');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, selectedNation, selectedCompId, page, pageSize, pageSizeReady, debouncedKeyword, refreshSignal, message]);

  useEffect(() => {
    loadAwards();
  }, [loadAwards]);

  // Filter summary:
  const levels: string[] = [];
  if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);
    const confed = selectedConfed !== 'all' ? selectedConfed : nationNode?.confed;
    if (confed) levels.push(confed);

    if (selectedCompId) {
      const nation3l = nationNode?.code3 || selectedNation;
      levels.push(nation3l);
      levels.push(`Comp: ${selectedCompId}`);
    } else {
      const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
      levels.push(nationName);
    }
  } else if (selectedCompId) {
    levels.push(`Comp: ${selectedCompId}`);
  } else if (selectedConfed !== 'all') {
    levels.push(selectedConfed);
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'All awards';
  const hasActiveCustomFilter = selectedConfed !== 'all' || selectedNation !== 'all' || !!selectedCompId;

  const handleOpenModal = () => {
    setTempConfed(selectedConfed);
    setTempNation(selectedNation);
    setTempCompId(selectedCompId);
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
    setTempCompId(undefined);
  };

  const applyFilterDirectly = (val: string) => {
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
    setSelectedCompId(undefined);
    setPage(1);
  };

  const handleClearComp = () => {
    setTempCompId(undefined);
    setSelectedCompId(undefined);
    setPage(1);
  };

  const handleResetModal = () => {
    setTempConfed('all');
    setTempCompId(undefined);
    setTempNation('all');
  };

  const handleApplyModal = () => {
    setSelectedConfed(tempConfed);
    setSelectedNation(tempNation);
    setSelectedCompId(tempCompId);
    setPage(1);
    setModalOpen(false);
  };

  const currentTreeSelectedKey = selectedCompId
    ? undefined
    : selectedNation !== 'all'
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
            <span className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center text-xs">
              <AwardIcon size={14} />
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
            mode="award"
            height="100%"
            selectedKey={currentTreeSelectedKey}
            onSelectNode={(val) => applyFilterDirectly(val)}
            allOptionLabel="All Awards"
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
              pageIcon={<AwardIcon size={20} />}
              iconBoxClassName="bg-rose-50 text-rose-600 border-rose-200/80"
              filterSummary={filterSummary}
              hasActiveCustomFilter={hasActiveCustomFilter}
              onClick={handleOpenModal}
            />
          </div>
        </div>

        {/* Khung Vùng danh sách bên dưới */}
        <div className="flex-1 min-h-0 h-full bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <CardGrid
            items={awards}
            type={EntityType.AWARD}
            loading={loading}
            containerRef={listContainerRef}
            onNavigate={(record) => {
              if (record?.id) {
                router.push(`/award/${record.id}`);
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
            emptyText="No matching awards found"
          />
        </div>
      </div>

      {/* 3. Modal bộ lọc Cây đơn vị */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AwardIcon size={16} />
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
        <div className="py-2 space-y-3">
          {/* Filter theo Comp nếu có */}
          {tempCompId && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Assigned competition:
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                <Tag
                  closable
                  color="magenta"
                  onClose={handleClearComp}
                  className="font-medium"
                >
                  Comp ID: {tempCompId}
                </Tag>
                <span className="text-xs text-slate-500">
                  Click × to switch to filtering by nation
                </span>
              </div>
            </div>
          )}

          {/* Cây đơn vị */}
          <div>
            <UnitTree
              mode="award"
              selectedKey={
                tempNation !== 'all'
                  ? tempNation
                  : tempConfed !== 'all'
                    ? tempConfed.toLowerCase()
                    : 'all'
              }
              onSelectNode={(val) => handlePickNation(val)}
              allOptionLabel="All Nations"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function ListAwardsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading awards...</div>}>
      <ListAwardsContent />
    </Suspense>
  );
}
