'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input, Modal, Button, Tag, App } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import CardGrid from '../../components/CardGrid';
import { ClubIcon } from '../../components/EntityIcons';
import UnitTree from '../../components/UnitTree';
import { useApp } from '../../context/AppContext';
import { searchClubs, fetchUnitTree, findNationInTree, fetchCompetitionInfo, ClubItem, UnitTreeNode } from '../../services/api';
import { EntityType } from '../../types';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';

function ListClubsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, refreshSignal } = useApp();

  const initialNationId = searchParams.get('nationId') || 'all';
  const initialCompId = searchParams.get('compId') || undefined;

  const [selectedConfed, setSelectedConfed] = useState<string>('all');
  const [selectedNation, setSelectedNation] = useState<string>(initialNationId);
  const [selectedCompId, setSelectedCompId] = useState<string | undefined>(initialCompId);
  const [selectedCompName, setSelectedCompName] = useState<string>('');
  const [extinctFilter, setExtinctFilter] = useState<string>('all');

  // Modal temporary state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [tempConfed, setTempConfed] = useState<string>('all');
  const [tempNation, setTempNation] = useState<string>(initialNationId);
  const [tempExtinct, setTempExtinct] = useState<string>('all');
  const [tempCompId, setTempCompId] = useState<string | undefined>(initialCompId);
  const [tempCompName, setTempCompName] = useState<string>('');

  const [treeNodes, setTreeNodes] = useState<UnitTreeNode[]>([]);
  const [keyword, setKeyword] = useState<string>('');
  const [submittedKeyword, setSubmittedKeyword] = useState<string>('');
  const [searchRequestId, setSearchRequestId] = useState<number>(0);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState<number>(0);

  const listContainerRef = useRef<HTMLDivElement>(null);

  // Load cấu trúc cây đơn vị
  useEffect(() => {
    fetchUnitTree('club')
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

  // Load comp name if initial compId is present
  useEffect(() => {
    if (selectedCompId && !selectedCompName) {
      if (selectedCompId.startsWith('oth-')) {
        setSelectedCompName('Other');
        setTempCompName('Other');
      } else if (selectedCompId.startsWith('ext-')) {
        setSelectedCompName('Extinct');
        setTempCompName('Extinct');
      } else {
        fetchCompetitionInfo(selectedCompId)
          .then((comp) => {
            if (comp) {
              const name = comp.name_sh || comp.name || comp.name_lg || '';
              setSelectedCompName(name);
              setTempCompName(name);
              if (comp.nation_id && selectedNation === 'all') {
                setSelectedNation(String(comp.nation_id));
                setTempNation(String(comp.nation_id));
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedCompId, selectedCompName, selectedNation]);

  const handleSearch = useCallback(() => {
    setSubmittedKeyword(keyword.trim());
    setPage(1);
    setSearchRequestId((current) => current + 1);
  }, [keyword]);

  // Set AppHeader
  useEffect(() => {
    setHeaderTitle('Clubs');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Clubs' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo]);

  // Scroll to top on filter/page change
  useEffect(() => {
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [selectedNation, selectedCompId, extinctFilter, page]);

  const loadClubs = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      const res = await searchClubs(
        {
          confedId: selectedConfed !== 'all' ? selectedConfed : undefined,
          nationId: selectedNation === 'all' ? undefined : selectedNation,
          compId: selectedCompId,
          extinct: extinctFilter === 'all' ? undefined : extinctFilter === 'extinct',
          page: page - 1,
          size: pageSize,
          keyword: submittedKeyword,
        },
        refreshSignal > 0 || searchRequestId > 0,
      );

      const items: ClubItem[] = Array.isArray(res) ? res : (res as any)?.content || [];
      const missingCompIds = Array.from(
        new Set(
          items
            .filter((club) => !club.comp && club.comp_id && !/^(oth|ext)-/i.test(String(club.comp_id)))
            .map((club) => String(club.comp_id)),
        ),
      );
      const loadedComps = await Promise.all(
        missingCompIds.map(async (compId) => {
          try {
            return [compId, await fetchCompetitionInfo(compId)] as const;
          } catch {
            return [compId, null] as const;
          }
        }),
      );
      const compsById = new Map(loadedComps);
      const hydratedItems = items.map((club) => {
        if (club.comp || !club.comp_id) return club;
        const comp = compsById.get(String(club.comp_id));
        return comp ? { ...club, comp } : club;
      });
      const totalElements = (res as any)?.totalElements ?? (res as any)?.total ?? items.length;
      setClubs(hydratedItems);
      setTotal(totalElements);
    } catch (err: any) {
      message.error(err.message || 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, [selectedConfed, selectedNation, selectedCompId, extinctFilter, page, pageSize, pageSizeReady, submittedKeyword, searchRequestId, refreshSignal, message]);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  // Filter summary:
  const levels: string[] = [];
  if (selectedNation !== 'all') {
    const nationNode = findNationInTree(treeNodes, selectedNation);

    if (selectedCompId) {
      // Cấp 2: [nation_3letter] Competition name
      const nation3l = nationNode?.code3 || selectedNation;

      let compName = selectedCompName;
      if (selectedCompId.startsWith('oth-')) compName = '[OTH] Other';
      else if (selectedCompId.startsWith('ext-')) compName = '[EXT] Extinct';
      else if (!compName) compName = `Comp: ${selectedCompId}`;
      levels.push(`[${nation3l}] ${compName}`);
    } else {
      // Cấp 1: Nation name
      const nationName = nationNode?.shortName || nationNode?.title || selectedNation;
      levels.push(nationName);

      if (extinctFilter === 'active') {
        levels.push('Active');
      } else if (extinctFilter === 'extinct') {
        levels.push('Dissolved');
      }
    }
  } else if (selectedConfed !== 'all') {
    levels.push(selectedConfed);
    if (extinctFilter === 'active') {
      levels.push('Active');
    } else if (extinctFilter === 'extinct') {
      levels.push('Dissolved');
    }
  } else if (extinctFilter === 'active') {
    levels.push('Active clubs');
  } else if (extinctFilter === 'extinct') {
    levels.push('Dissolved clubs');
  }

  const filterSummary = levels.length > 0 ? levels.join(' > ') : 'All clubs';

  const handleOpenModal = () => {
    setTempConfed(selectedConfed);
    setTempNation(selectedNation);
    setTempExtinct(extinctFilter);
    setTempCompId(selectedCompId);
    setTempCompName(selectedCompName);
    setModalOpen(true);
  };

  const confedKeys = ['afc', 'caf', 'concacaf', 'conmebol', 'ofc', 'uefa'];

  // Đổi option trên cây trong modal -> chỉ cập nhật giá trị tạm (temp)
  const handleSelectTreeNode = (key: string, nodeData?: any) => {
    const lk = key.toLowerCase();
    if (key === 'all') {
      setTempConfed('all');
      setTempNation('all');
      setTempCompId(undefined);
      setTempCompName('');
      setTempExtinct('all');
    } else if (key.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = key.replace('confed_', '').toUpperCase();
      setTempConfed(confedCode);
      setTempNation('all');
      setTempCompId(undefined);
      setTempCompName('');
    } else if (key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      const nationNode = findNationInTree(treeNodes, nid);
      if (nationNode?.confed) setTempConfed(nationNode.confed);
      setTempNation(nid);
      setTempCompId(undefined);
      setTempCompName('');
    } else if (key.startsWith('comp_')) {
      const compId = key.replace('comp_', '');
      const nid = nodeData?.nationId || nodeData?.compData?.nation_id;
      if (nid) {
        setTempNation(nid);
      }
      setTempCompId(compId);
      const cName = nodeData?.shortName || nodeData?.compData?.name_sh || nodeData?.compData?.name || '';
      setTempCompName(cName);
    } else if (key.startsWith('oth_')) {
      const nid = key.replace('oth_', '');
      setTempNation(nid);
      setTempCompId('oth-' + nid);
      setTempExtinct('active');
      setTempCompName('[OTH] Other');
    } else if (key.startsWith('ext_')) {
      const nid = key.replace('ext_', '');
      setTempNation(nid);
      setTempCompId('ext-' + nid);
      setTempExtinct('extinct');
      setTempCompName('[EXT] Extinct');
    }
  };

  const currentTreeSelectedKey = selectedCompId
    ? selectedCompId.startsWith('oth-')
      ? `oth_${selectedCompId.slice(4)}`
      : selectedCompId.startsWith('ext-')
      ? `ext_${selectedCompId.slice(4)}`
      : `comp_${selectedCompId}`
    : selectedNation !== 'all'
    ? `nation_${selectedNation}`
    : selectedConfed !== 'all'
    ? selectedConfed.toLowerCase()
    : 'all';

  const applyFilterDirectly = (key: string, nodeData?: any) => {
    const lk = key.toLowerCase();
    if (key === 'all') {
      setSelectedConfed('all');
      setSelectedNation('all');
      setSelectedCompId(undefined);
      setSelectedCompName('');
      setExtinctFilter('all');
    } else if (key.startsWith('confed_') || confedKeys.includes(lk)) {
      const confedCode = key.replace('confed_', '').toUpperCase();
      setSelectedConfed(confedCode);
      setSelectedNation('all');
      setSelectedCompId(undefined);
      setSelectedCompName('');
    } else if (key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      const nationNode = findNationInTree(treeNodes, nid);
      if (nationNode?.confed) setSelectedConfed(nationNode.confed);
      setSelectedNation(nid);
      setSelectedCompId(undefined);
      setSelectedCompName('');
    } else if (key.startsWith('comp_')) {
      const compId = key.replace('comp_', '');
      const nid = nodeData?.nationId || nodeData?.compData?.nation_id;
      if (nid) {
        setSelectedNation(nid);
      }
      setSelectedCompId(compId);
      const cName = nodeData?.shortName || nodeData?.compData?.name_sh || nodeData?.compData?.name || '';
      setSelectedCompName(cName);
    } else if (key.startsWith('oth_')) {
      const nid = key.replace('oth_', '');
      setSelectedNation(nid);
      setSelectedCompId('oth-' + nid);
      setExtinctFilter('active');
      setSelectedCompName('[OTH] Other');
    } else if (key.startsWith('ext_')) {
      const nid = key.replace('ext_', '');
      setSelectedNation(nid);
      setSelectedCompId('ext-' + nid);
      setExtinctFilter('extinct');
      setSelectedCompName('[EXT] Extinct');
    }
    setPage(1);
  };

  const handleClearComp = () => {
    setTempCompId(undefined);
    setTempCompName('');
    setSelectedCompId(undefined);
    setSelectedCompName('');
    setPage(1);
  };

  const handleResetModal = () => {
    setTempConfed('all');
    setTempNation('all');
    setTempExtinct('all');
    setTempCompId(undefined);
    setTempCompName('');
  };

  const handleApplyModal = () => {
    setSelectedConfed(tempConfed);
    setSelectedNation(tempNation);
    setSelectedCompId(tempCompId);
    setSelectedCompName(tempCompName);
    setExtinctFilter(tempExtinct);
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
            <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xs">
              <ClubIcon size={14} />
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
            mode="club"
            height="100%"
            selectedKey={currentTreeSelectedKey}
            onSelectNode={(key, node) => applyFilterDirectly(key, node)}
            allOptionLabel="All Clubs"
          />
        </div>
      </aside>

      {/* 2. KHU VỰC BÊN PHẢI: Search + Vùng Danh Sách */}
      <div className="flex-1 min-w-0 min-h-0 h-full flex flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-col gap-1.5">
        {/* Search */}
        <div className="shrink-0 flex-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenModal}
              aria-label="Open club filter"
              title="Club filter"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-indigo-200/80 bg-white text-indigo-600 shadow-2xs transition-colors hover:border-indigo-400 hover:bg-slate-50 md:hidden"
            >
              <ClubIcon size={20} />
            </button>
            <Input
              size="middle"
              placeholder="Search..."
              allowClear
              prefix={
                <button
                  type="button"
                  aria-label="Search clubs"
                  onClick={handleSearch}
                  className="mr-2 flex cursor-pointer items-center border-0 bg-transparent p-0 text-lg text-slate-500 transition-colors hover:text-blue-600"
                >
                  <SearchOutlined />
                </button>
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm shadow-2xs transition-colors hover:bg-white hover:border-blue-400 focus:bg-white focus:border-blue-500"
            />
          </div>

        </div>

        {/* Mobile: chỉ hiển thị kết quả filter hiện tại */}
        <div className="shrink-0 md:hidden">
          <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs">
            <span className="whitespace-normal break-words text-sm font-semibold leading-snug text-slate-800">
              {filterSummary}
            </span>
          </div>
        </div>
        </div>

        {/* Khung Vùng danh sách bên dưới */}
        <div className="flex-1 min-h-0 h-full bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <CardGrid
            items={clubs}
            type={EntityType.CLUB}
            loading={loading}
            containerRef={listContainerRef}
            cardSize="large"
            onNavigate={(record) => {
              if (record?.id) {
                router.push(`/club/${record.id}`);
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
            emptyText="No matching clubs found"
          />
        </div>
      </div>

      {/* 3. Modal bộ lọc Câu lạc bộ */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 text-base font-bold pb-1">
            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <ClubIcon size={16} />
            </span>
            <span>Club Filter</span>
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
            mode="club"
            selectedKey={
              tempCompId
                ? tempCompId.startsWith('oth-')
                  ? `oth_${tempCompId.slice(4)}`
                  : tempCompId.startsWith('ext-')
                  ? `ext_${tempCompId.slice(4)}`
                  : `comp_${tempCompId}`
                : tempNation !== 'all'
                ? `nation_${tempNation}`
                : 'all'
            }
            onSelectNode={handleSelectTreeNode}
          />
        </div>
      </Modal>
    </div>
  );
}

export default function ListClubsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading clubs...</div>}>
      <ListClubsContent />
    </Suspense>
  );
}
