'use client';

import React, { useMemo } from 'react';
import { TreeSelect } from 'antd';
import { NationItem } from '../services/api';

export const CONFEDERATION_META: Record<
  string,
  { name: string; icon: string; order: number }
> = {
  UEFA: { name: 'Europe', icon: '🇪🇺', order: 1 },
  AFC: { name: 'Asia', icon: '🌏', order: 2 },
  CAF: { name: 'Africa', icon: '🌍', order: 3 },
  CONCACAF: { name: 'North, Central America & Caribbean', icon: '🌎', order: 4 },
  CONMEBOL: { name: 'South America', icon: '🌎', order: 5 },
  OFC: { name: 'Oceania', icon: '🌏', order: 6 },
  EXTINCT: { name: 'Historical / Dissolved Nations', icon: '🏛️', order: 7 },
};

export function getNationDisplayName(
  nations: NationItem[],
  nationId?: string | null,
  fallbackText = 'All nations',
): string {
  if (!nationId || nationId === 'all') {
    return fallbackText;
  }
  const found = nations.find((n) => String(n.id) === String(nationId));
  if (found) {
    const code = found.name_3l || (found as any).code;
    const name = found.name_lg || found.name || `ID ${found.id}`;
    return code ? `[${code}] ${name}` : name;
  }
  return `ID: ${nationId}`;
}

export function buildNationTreeData(nations: NationItem[], includeAllOption = true) {
  // Group nations by confederation
  const groups: Record<string, NationItem[]> = {};

  Object.keys(CONFEDERATION_META).forEach((code) => {
    groups[code] = [];
  });

  nations.forEach((n) => {
    let confedKey = 'EXTINCT';
    if (typeof n.confed === 'string') {
      confedKey = n.confed.toUpperCase();
    } else if (n.confed && typeof n.confed === 'object') {
      confedKey = (n.confed.code || n.confed.name || 'OTHER').toUpperCase();
    } else if (n.confed_id) {
      confedKey = String(n.confed_id).toUpperCase();
    }

    if (!groups[confedKey]) {
      groups[confedKey] = [];
    }
    groups[confedKey].push(n);
  });

  const treeNodes: any[] = [];

  if (includeAllOption) {
    treeNodes.push({
      title: '🌍 All Nations',
      value: 'all',
      key: 'all',
    });
  }

  // Sort confederations by predefined order
  const sortedConfeds = Object.keys(groups).sort((a, b) => {
    const orderA = CONFEDERATION_META[a]?.order ?? 99;
    const orderB = CONFEDERATION_META[b]?.order ?? 99;
    return orderA - orderB;
  });

  sortedConfeds.forEach((confedKey) => {
    const list = groups[confedKey];
    if (!list || list.length === 0) return;

    // Sort nations alphabetically by name
    const sortedNations = [...list].sort((a, b) => {
      const nameA = a.name_lg || a.name || '';
      const nameB = b.name_lg || b.name || '';
      return nameA.localeCompare(nameB);
    });

    const meta = CONFEDERATION_META[confedKey] || {
      name: confedKey,
      icon: '🌐',
      order: 99,
    };

    treeNodes.push({
      title: `${meta.icon} ${confedKey} - ${meta.name} (${sortedNations.length})`,
      value: `confed_${confedKey}`,
      key: `confed_${confedKey}`,
      selectable: false,
      children: sortedNations.map((n) => {
        const code = n.name_3l || (n as any).code || '---';
        const lgName = n.name_lg || n.name || '';
        const enName = n.name && n.name !== lgName ? ` (${n.name})` : '';
        const fullTitle = `[${code}] ${lgName}${enName}`;

        return {
          title: fullTitle,
          value: String(n.id),
          key: String(n.id),
          selectable: true,
        };
      }),
    });
  });

  return treeNodes;
}

interface NationTreeSelectProps {
  nations: NationItem[];
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'large' | 'middle' | 'small';
  allowClear?: boolean;
  disabled?: boolean;
  includeAllOption?: boolean;
}

export default function NationTreeSelect({
  nations,
  value,
  onChange,
  placeholder = 'Search & select nation...',
  className = 'w-full',
  size = 'middle',
  allowClear = false,
  disabled = false,
  includeAllOption = true,
}: NationTreeSelectProps) {
  const treeData = useMemo(
    () => buildNationTreeData(nations, includeAllOption),
    [nations, includeAllOption],
  );

  return (
    <TreeSelect
      showSearch
      treeNodeFilterProp="title"
      className={className}
      value={value}
      onChange={(val) => onChange && onChange(val as string)}
      treeData={treeData}
      placeholder={placeholder}
      allowClear={allowClear}
      disabled={disabled}
      size={size}
      dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
      treeDefaultExpandAll={false}
      getPopupContainer={(trigger) => trigger.parentElement || document.body}
    />
  );
}

