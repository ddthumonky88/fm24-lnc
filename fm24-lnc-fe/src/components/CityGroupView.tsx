'use client';

import React, { useState, useMemo } from 'react';
import { Badge, Empty, Select } from 'antd';
import CardGrid from './CardGrid';
import { CityIcon } from './EntityIcons';
import { RegionItem } from '../services/api';

interface CityGroupViewProps {
  items: any[];
  loading?: boolean;
  regions?: RegionItem[];
  selectedRegion?: number | string;
  onSelectRegion?: (regionId: number | string) => void;
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

export interface CityCategoryGroup {
  key: string;
  label: string;
  isUncategorized: boolean;
  items: any[];
}

function normalizeCityRegionGroup(value: unknown): string {
  const region = String(value || '').trim();
  if (!region) return '';

  const marker = region.toUpperCase();
  if (marker === '[REMOVE]' || marker === '[OTHER]' || marker === '[OTHERS]') {
    return marker;
  }

  return region.replace(/^\[[^\]]+\]\s+/, '').trim();
}

export default function CityGroupView({
  items,
  loading,
  regions,
  selectedRegion,
  onSelectRegion,
  onNavigate,
  onEdit,
  onDelete,
  emptyText = 'No cities found',
  extraRight,
  serverPagination,
}: CityGroupViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group cities by category / region
  const { groups, categoryList } = useMemo(() => {
    const map = new Map<string, any[]>();
    const uncategorizedItems: any[] = [];

    items.forEach((item) => {
      const rawCat = normalizeCityRegionGroup(
        (typeof item.region === 'object' ? item.region?.name : item.region) ||
          item.region_name ||
          item.categories,
      );
      if (!rawCat) {
        uncategorizedItems.push(item);
      } else {
        if (!map.has(rawCat)) {
          map.set(rawCat, []);
        }
        map.get(rawCat)!.push(item);
      }
    });

    const sortedKeys = Array.from(map.keys());

    const resultGroups: CityCategoryGroup[] = sortedKeys.map((key) => {
      const groupItems = map.get(key) || [];
      return {
        key,
        label: key,
        isUncategorized: false,
        items: groupItems,
      };
    });

    if (uncategorizedItems.length > 0) {
      resultGroups.push({
        key: '__uncategorized__',
        label: 'Uncategorized',
        isUncategorized: true,
        items: uncategorizedItems,
      });
    }

    return {
      groups: resultGroups,
      categoryList: resultGroups.map((g) => ({
        value: g.key,
        label: g.label,
      })),
    };
  }, [items]);

  // Sort all items by region (categories), with REMOVE always at the end
  const sortedAllItems = useMemo(() => {
    return items;
  }, [items]);

  const regionOptions = useMemo(() => {
    if (regions && regions.length > 0) {
      return [
        {
          value: 'all',
          label: 'All Regions',
        },
        ...regions.map((r) => ({
          value: r.regionCode || r.code || String(r.id),
          label:
            r.citiesCount !== undefined && r.citiesCount > 0
              ? `${r.name} (${r.citiesCount})`
              : r.name,
        })),
      ];
    }
    return [
      {
        value: 'all',
        label: 'All Regions',
      },
      ...categoryList,
    ];
  }, [regions, categoryList]);

  // Calculate effective selected category so it safely falls back to 'all' if filtered out
  const effectiveCategory =
    selectedCategory === 'all'
      ? 'all'
      : categoryList.some((c) => c.value === selectedCategory)
        ? selectedCategory
        : 'all';

  if (loading) {
    return (
      <div className="text-center py-16 text-sm text-gray-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading cities...</span>
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
          value={onSelectRegion ? (selectedRegion ?? 'all') : effectiveCategory}
          onChange={(val) => {
            if (onSelectRegion) {
              onSelectRegion(val || 'all');
            } else {
              setSelectedCategory(String(val || 'all'));
            }
          }}
          options={regionOptions}
          className="w-full text-xs"
          classNames={{
            popup: {
              root: 'text-xs [&_.ant-select-item-option-content]:text-xs [&_.ant-select-item]:py-1',
            },
          }}
          styles={{ popup: { root: { fontSize: '12px' } } }}
        />
      </div>
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        {renderToolbar()}
        <div className="py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <Empty description={emptyText} />
        </div>
      </div>
    );
  }

  const activeGroup =
    effectiveCategory !== 'all' ? groups.find((g) => g.key === effectiveCategory) : null;

  return (
    <div className="space-y-4">
      {/* Category / Region Filter Toolbar with Select */}
      {renderToolbar()}

      {/* Render Cities Grid */}
      {onSelectRegion ? (
        <CardGrid
          key={String(selectedRegion || 'all')}
          items={items}
          type="city"
          cardSize="small"
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          emptyText={emptyText}
          defaultPageSize={20}
          serverPagination={serverPagination}
        />
      ) : effectiveCategory !== 'all' && activeGroup ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CityIcon size={18} />
              </span>
              <h3
                className={`font-bold text-sm tracking-wide ${
                  activeGroup.label.toUpperCase().includes('REMOVE') ||
                  activeGroup.label.toUpperCase().includes('OTHER') ||
                  activeGroup.label.toUpperCase().includes('EXTINCT')
                    ? 'text-red-600'
                    : 'text-gray-800'
                }`}
              >
                {activeGroup.label}
              </h3>
              <Badge
                count={activeGroup.items.length}
                overflowCount={99999}
                style={{ backgroundColor: '#4f46e5' }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {activeGroup.items.length} {activeGroup.items.length === 1 ? 'city' : 'cities'}
            </span>
          </div>

          <CardGrid
            key={selectedCategory}
            items={activeGroup.items}
            type="city"
            cardSize="small"
            onNavigate={onNavigate}
            onEdit={onEdit}
            onDelete={onDelete}
            emptyText={emptyText}
            defaultPageSize={20}
          />
        </div>
      ) : (
        /* All Regions: do not group, render single unified grid sorted by region */
        <CardGrid
          key="all"
          items={sortedAllItems}
          type="city"
          cardSize="small"
          onNavigate={onNavigate}
          onEdit={onEdit}
          onDelete={onDelete}
          emptyText={emptyText}
          defaultPageSize={20}
          serverPagination={serverPagination}
        />
      )}
    </div>
  );
}
