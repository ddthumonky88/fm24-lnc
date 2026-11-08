'use client';

import React, { useState, useMemo } from 'react';
import { Badge, Empty, Select } from 'antd';
import { StarOutlined, GlobalOutlined, AppstoreOutlined, CloseCircleOutlined } from '@ant-design/icons';
import CardGrid from './CardGrid';
import SubCompetitionsModal from './SubCompetitionsModal';
import { CompIcon, AwardIcon } from './EntityIcons';

export type CompetitionGroupKey = 'all' | 'league' | 'cup' | 'youth' | 'other' | 'extinct';
export type CompetitionCategory = 'league' | 'cup' | 'youth' | 'other' | 'extinct';

export function getCompetitionGroup(target?: any): CompetitionCategory {
  if (!target) return 'other';
  const item = typeof target === 'object' ? target : { type: target, categories: target };
  const id = String(item?.id || '');

  // 1. Virtual Extinct Clubs
  if (
    id === '[EXTINCT]' ||
    id.startsWith('ext-') ||
    item?.virtual_type === 'EXTINCT' ||
    item?.name_lg === '[EXTINCT]' ||
    item?.name === '[EXTINCT]'
  ) {
    return 'extinct';
  }

  // 2. Virtual Other Clubs
  if (
    id === '[OTHER]' ||
    id.startsWith('oth-') ||
    item?.virtual_type === 'OTHER' ||
    item?.name_lg === '[OTHER]' ||
    item?.name === '[OTHER]'
  ) {
    return 'other';
  }

  const cat = String(item?.type || item?.categories || item?.category || '')
    .trim()
    .toLowerCase();
  if (!cat) return 'other';

  // 3. Extinct competitions
  if (cat.includes('extinct')) return 'extinct';

  // 4. Youth
  if (cat.includes('youth') || cat.includes('reserves') || cat.includes('juvenil')) return 'youth';

  // 5. Cup
  if (cat.includes('cup')) return 'cup';

  // 6. League
  if (
    cat.includes('league') ||
    cat.includes('division') ||
    cat.includes('tier') ||
    cat.includes('lower leagues')
  ) {
    return 'league';
  }

  return 'other';
}

interface CompetitionGroupViewProps {
  items: any[];
  loading?: boolean;
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  emptyText?: string;
  extraRight?: React.ReactNode;
  serverPagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export default function CompetitionGroupView({
  items,
  loading,
  onNavigate,
  onEdit,
  onDelete,
  emptyText = 'No competitions found',
  extraRight,
  serverPagination,
}: CompetitionGroupViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<CompetitionGroupKey>('all');
  const [modalParent, setModalParent] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Visible items: parent/top-level competitions (sub-competitions are organized inside parent modal)
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (item.parent_comp?.id || item.parent_id || item.parent?.id) return false;
      return true;
    });
  }, [items]);

  const handleViewChildren = (comp: any) => {
    setModalParent(comp);
    setIsModalOpen(true);
  };

  const sortedAllItems = useMemo(() => {
    return visibleItems;
  }, [visibleItems]);

  const { leagueItems, cupItems, youthItems, otherItems, extinctItems } = useMemo(() => {
    const league: any[] = [];
    const cup: any[] = [];
    const youth: any[] = [];
    const other: any[] = [];
    const extinct: any[] = [];

    visibleItems.forEach((item) => {
      const g = getCompetitionGroup(item);
      if (g === 'league') league.push(item);
      else if (g === 'cup') cup.push(item);
      else if (g === 'youth') youth.push(item);
      else if (g === 'extinct') extinct.push(item);
      else other.push(item);
    });

    return {
      leagueItems: league,
      cupItems: cup,
      youthItems: youth,
      otherItems: other,
      extinctItems: extinct,
    };
  }, [visibleItems]);

  const groupConfigs = useMemo(
    () => [
      {
        key: 'league' as const,
        label: 'League',
        icon: <CompIcon size={16} className="text-amber-500" />,
        color: '#1677ff',
        items: leagueItems,
      },
      {
        key: 'cup' as const,
        label: 'Cup',
        icon: <AwardIcon size={16} className="text-emerald-500" />,
        color: '#52c41a',
        items: cupItems,
      },
      {
        key: 'youth' as const,
        label: 'Youth',
        icon: <StarOutlined className="text-purple-500 text-sm" />,
        color: '#722ed1',
        items: youthItems,
      },
      {
        key: 'other' as const,
        label: 'Other Competitions',
        icon: <GlobalOutlined className="text-gray-500 text-sm" />,
        color: '#64748b',
        items: otherItems,
      },
      {
        key: 'extinct' as const,
        label: 'Extinct Competitions',
        icon: <CloseCircleOutlined className="text-rose-500 text-sm" />,
        color: '#e11d48',
        items: extinctItems,
      },
    ],
    [leagueItems, cupItems, youthItems, otherItems, extinctItems],
  );

  const selectOptions = useMemo(() => {
    return [
      {
        value: 'all',
        label: (
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="flex items-center gap-1.5 text-xs">
              <AppstoreOutlined className="text-blue-500" />
              <span>All Categories</span>
            </span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 font-semibold">
              {visibleItems.length}
            </span>
          </div>
        ),
      },
      ...groupConfigs
        .filter((g) => g.items.length > 0)
        .map((g) => ({
          value: g.key,
          label: (
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="flex items-center gap-1.5 text-xs">
                {g.icon}
                <span>{g.label}</span>
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-600 font-semibold">
                {g.items.length}
              </span>
            </div>
          ),
        })),
    ];
  }, [groupConfigs, visibleItems.length]);

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading competitions...</span>
      </div>
    );
  }

  const renderToolbar = () => (
    <div className="sticky top-0 z-10 flex flex-col gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-gray-200/80 shadow-xs mb-3">
      {extraRight && (
        <div className="w-full flex items-center gap-2 min-w-0">{extraRight}</div>
      )}

      <div className="w-full">
        <Select
          value={selectedGroup}
          onChange={(val) => setSelectedGroup(val as CompetitionGroupKey)}
          options={selectOptions}
          className="w-full text-xs"
          popupMatchSelectWidth={false}
          classNames={{
            popup: {
              root: 'text-xs [&_.ant-select-item-option-content]:text-xs [&_.ant-select-item]:py-1',
            },
          }}
          styles={{ popup: { root: { fontSize: '12px', minWidth: 230 } } }}
        />
      </div>
    </div>
  );

  if (visibleItems.length === 0) {
    return (
      <div className="space-y-4">
        {renderToolbar()}
        <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <Empty description={emptyText} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Integrated 1-Line Toolbar */}
      {renderToolbar()}

      {/* Render Sections */}
      {selectedGroup === 'all' ? (
        <CardGrid
          key="all"
          items={sortedAllItems}
          type="competition"
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewChildren={handleViewChildren}
          emptyText={emptyText}
          defaultPageSize={20}
          serverPagination={serverPagination}
        />
      ) : (
        <div>
          {(() => {
            const activeConfig = groupConfigs.find((g) => g.key === selectedGroup);
            const activeItems = activeConfig?.items || [];

            if (activeItems.length === 0) {
              return (
                <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <Empty
                    description={`No ${activeConfig?.label.toLowerCase()} competitions found`}
                  />
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    {activeConfig?.icon}
                    <h3 className="font-bold text-sm text-gray-800 tracking-wide uppercase">
                      {activeConfig?.label}
                    </h3>
                    <Badge
                      count={activeItems.length}
                      overflowCount={99999}
                      color={activeConfig?.color}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {activeItems.length} {activeItems.length === 1 ? 'competition' : 'competitions'}
                  </span>
                </div>

                <CardGrid
                  key={selectedGroup}
                  items={activeItems}
                  type="competition"
                  onNavigate={onNavigate}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewChildren={handleViewChildren}
                  defaultPageSize={20}
                />
              </div>
            );
          })()}
        </div>
      )}

      <SubCompetitionsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parentComp={modalParent}
        allCompetitions={items}
        onEdit={onEdit}
        onDelete={onDelete}
        onNavigate={onNavigate}
      />
    </div>
  );
}
