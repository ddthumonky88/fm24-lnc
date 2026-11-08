'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tree, Input, Spin } from 'antd';
import { DownOutlined, RightOutlined, CheckOutlined } from '@ant-design/icons';
import { NationItem, CompetitionItem, fetchDomesticCompetitions, fetchUnitTree, UnitTreeNode } from '../services/api';
import type { DataNode } from 'antd/es/tree';


export interface UnitTreeProps {
  mode?: 'comp' | 'club' | 'city' | 'stadium' | 'award' | 'nation' | 'default';
  nations?: NationItem[];
  selectedKey?: string;
  onSelectNode: (key: string, nodeData?: any) => void;
  showAllOption?: boolean;
  allOptionLabel?: string;
  allowSelectConfed?: boolean;
  confedOnly?: boolean;
  includeExtinct?: boolean;
  className?: string;
  height?: number | string;
}

export const ORDERED_CONFED_CODES = ['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA'];

export const CONFED_DISPLAY_NAMES: Record<string, string> = {
  AFC: 'Asia',
  CAF: 'Africa',
  CONCACAF: 'North America',
  CONMEBOL: 'South America',
  OFC: 'Oceania',
  UEFA: 'Europe',
  WORLD: 'World',
  EXTINCT: 'Extinct',
};

export function getConfedTitle(code: string): string {
  const upper = String(code || '').trim().toUpperCase();
  const name = CONFED_DISPLAY_NAMES[upper];
  return name ? `[${upper}] ${name}` : upper;
}

export const CONFEDERATION_META: Record<
  string,
  { name: string; icon: string; order: number }
> = {
  WORLD: { name: 'Global', icon: '🌐', order: 0 },
  AFC: { name: 'Asia', icon: '🌏', order: 1 },
  CAF: { name: 'Africa', icon: '🌍', order: 2 },
  CONCACAF: { name: 'North, Central America & Caribbean', icon: '🌎', order: 3 },
  CONMEBOL: { name: 'South America', icon: '🌎', order: 4 },
  OFC: { name: 'Oceania', icon: '🌏', order: 5 },
  UEFA: { name: 'Europe', icon: '🇪🇺', order: 6 },
  EXTINCT: { name: 'Historical / Dissolved Nations', icon: '🏛️', order: 7 },
};

function getExpandedKeysForSelectedKey(nodes: UnitTreeNode[], targetKey: string): React.Key[] {
  const keys: React.Key[] = [];
  function traverse(list: UnitTreeNode[], path: React.Key[]): boolean {
    for (const node of list) {
      const nodeKey = String(node.key);
      const normalizedNodeKey = nodeKey.toLowerCase();
      const normalizedTargetKey = String(targetKey).toLowerCase();
      const match =
        normalizedNodeKey === normalizedTargetKey ||
        (normalizedTargetKey.startsWith('nation_') &&
          normalizedNodeKey === normalizedTargetKey.replace('nation_', '')) ||
        normalizedNodeKey === `nation_${normalizedTargetKey}`;
      if (match) {
        keys.push(...path);
        return true;
      }
      if (node.children && node.children.length > 0) {
        if (traverse(node.children, [...path, node.key])) {
          return true;
        }
      }
    }
    return false;
  }
  traverse(nodes, []);
  return keys;
}

function findActualTreeKey(nodes: DataNode[], targetKey?: string): React.Key | undefined {
  if (!targetKey) return undefined;

  const normalizedTarget = String(targetKey).toLowerCase();
  for (const node of nodes) {
    if (String(node.key).toLowerCase() === normalizedTarget) return node.key;
    if (node.children?.length) {
      const childKey = findActualTreeKey(node.children, targetKey);
      if (childKey !== undefined) return childKey;
    }
  }
  return undefined;
}

export default function UnitTree({
  mode,
  nations = [],
  selectedKey,
  onSelectNode,
  showAllOption = true,
  allOptionLabel = 'ALL',
  allowSelectConfed = true,
  confedOnly = false,
  includeExtinct,
  className = '',
  height = 440,
}: UnitTreeProps) {
  const currentMode = mode || (confedOnly ? 'nation' : 'default');
  const isNationScreen = currentMode === 'nation' || (includeExtinct ?? confedOnly);

  const [keyword, setKeyword] = useState('');
  const [nationCompsCache, setNationCompsCache] = useState<Record<string, CompetitionItem[]>>({});
  const [apiTreeData, setApiTreeData] = useState<UnitTreeNode[] | null>(null);
  const [loadingTree, setLoadingTree] = useState<boolean>(false);

  // Gọi API lấy cấu trúc cây đơn vị theo currentMode
  useEffect(() => {
    let isMounted = true;
    setLoadingTree(true);
    fetchUnitTree(currentMode)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setApiTreeData(data);
        }
      })
      .catch((err) => {
        console.warn('Lỗi khi tải cây đơn vị từ API, fallback sang tính toán cục bộ:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingTree(false);
      });
    return () => {
      isMounted = false;
    };
  }, [currentMode]);

  // Tự động mở rộng nhánh khi có selectedKey
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(() => {
    if (selectedKey && selectedKey !== 'all') {
      const keys: React.Key[] = [];
      let targetNationId = '';

      if (selectedKey.startsWith('nation_')) {
        targetNationId = selectedKey.replace('nation_', '');
      } else if (selectedKey.startsWith('comp_') || selectedKey.startsWith('oth_') || selectedKey.startsWith('ext_')) {
        if (selectedKey.startsWith('oth_')) targetNationId = selectedKey.replace('oth_', '');
        else if (selectedKey.startsWith('ext_')) targetNationId = selectedKey.replace('ext_', '');
      } else if (!selectedKey.startsWith('confed_') && !selectedKey.startsWith('intl_')) {
        targetNationId = selectedKey;
      }

      if (targetNationId) {
        const targetNation = nations.find((n) => String(n.id) === String(targetNationId));
        if (targetNation) {
          let ck = '';
          if (typeof targetNation.confed === 'string') ck = targetNation.confed.toLowerCase();
          else if (targetNation.confed?.code) ck = targetNation.confed.code.toLowerCase();
          else if (targetNation.confed_id) ck = String(targetNation.confed_id).toLowerCase();
          if (ck) {
            keys.push(ck);
            keys.push(`confed_${ck.toUpperCase()}`);
          }
        }
        if (currentMode === 'club') {
          keys.push(`nation_${targetNationId}`);
        }
      } else if (selectedKey.startsWith('intl_')) {
        const ck = selectedKey.replace('intl_', '').toLowerCase();
        keys.push(ck);
        keys.push(`confed_${ck.toUpperCase()}`);
      }
      return keys;
    }
    return [];
  });
  const [autoExpandParent, setAutoExpandParent] = useState(true);

  // Khi apiTreeData tải xong hoặc selectedKey thay đổi: tự động tìm nhánh cha và mở rộng
  useEffect(() => {
    if (apiTreeData && apiTreeData.length > 0 && selectedKey && selectedKey !== 'all') {
      const keys = getExpandedKeysForSelectedKey(apiTreeData, selectedKey);
      if (keys.length > 0) {
        setExpandedKeys((prev) => Array.from(new Set([...prev, ...keys])));
        setAutoExpandParent(true);
      }
    }
  }, [apiTreeData, selectedKey]);

  // Pre-load comps cho nation đã chọn khi mở modal ở màn club
  useEffect(() => {
    if (currentMode === 'club' && selectedKey && selectedKey !== 'all') {
      let targetNationId = '';
      if (selectedKey.startsWith('nation_')) targetNationId = selectedKey.replace('nation_', '');
      else if (selectedKey.startsWith('oth_')) targetNationId = selectedKey.replace('oth_', '');
      else if (selectedKey.startsWith('ext_')) targetNationId = selectedKey.replace('ext_', '');

      if (targetNationId && nationCompsCache[targetNationId] === undefined) {
        fetchDomesticCompetitions(targetNationId, { size: 100 })
          .then((res: any) => {
            const list = Array.isArray(res) ? res : res?.content || [];
            const regularComps = list.filter(
              (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
            );
            setNationCompsCache((prev) => ({
              ...prev,
              [targetNationId]: regularComps,
            }));
          })
          .catch(() => {});
      }
    }
  }, [currentMode, selectedKey, nationCompsCache]);

  // Khi apiTreeData load xong, tự động tìm và expand các node cha của selectedKey nếu có
  useEffect(() => {
    if (apiTreeData && selectedKey && selectedKey !== 'all') {
      const findParents = (nodes: any[], target: string, parents: React.Key[] = []): React.Key[] | null => {
        for (const n of nodes) {
          if (String(n.key) === target) return parents;
          if (n.children && n.children.length > 0) {
            const res = findParents(n.children, target, [...parents, n.key]);
            if (res) return res;
          }
        }
        return null;
      };
      const parents = findParents(apiTreeData, String(selectedKey));
      if (parents && parents.length > 0) {
        setExpandedKeys((prev) => Array.from(new Set([...prev, ...parents])));
      }
    }
  }, [apiTreeData, selectedKey]);

  // Handler load data bất đồng bộ cho Cấp 3 màn club (khi dùng local fallback)
  const handleLoadData = (treeNode: any) => {
    return new Promise<void>((resolve) => {
      if (currentMode !== 'club' || treeNode.level !== 2) {
        resolve();
        return;
      }

      const nationId = String(treeNode.nationData?.id || treeNode.key.replace('nation_', ''));
      if (!nationId || nationCompsCache[nationId] !== undefined) {
        resolve();
        return;
      }

      fetchDomesticCompetitions(nationId, { size: 100 })
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.content || [];
          const regularComps = list.filter(
            (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
          );
          setNationCompsCache((prev) => ({
            ...prev,
            [nationId]: regularComps,
          }));
          resolve();
        })
        .catch(() => {
          setNationCompsCache((prev) => ({
            ...prev,
            [nationId]: [],
          }));
          resolve();
        });
    });
  };

  // Xây dựng cây đơn vị
  const rawTreeData: DataNode[] = useMemo(() => {
    // Nếu API đã trả về cấu trúc cây trực tiếp => ưu tiên sử dụng
    if (apiTreeData && apiTreeData.length > 0) {
      return apiTreeData as unknown as DataNode[];
    }
    // ==========================================
    // 1. MÀN NATION: Cấp 1 duy nhất [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA, EXTINCT]
    // ==========================================
    if (currentMode === 'nation') {
      const nodes: DataNode[] = [];
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          code3: 'ALL',
          shortName: '',
          noTag: false,
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      const confedCodes = [...ORDERED_CONFED_CODES, 'EXTINCT'];
      confedCodes.forEach((code) => {
        const isExt = code === 'EXTINCT';
        nodes.push({
          key: code.toLowerCase(),
          title: isExt ? '[EXT] Extinct' : getConfedTitle(code),
          code3: isExt ? 'EXT' : code,
          shortName: CONFED_DISPLAY_NAMES[code] || code,
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
          isExtinct: isExt,
        } as any);
      });
      return nodes;
    }

    // Nhóm quốc gia theo confederation
    const groups: Record<string, NationItem[]> = {};
    ORDERED_CONFED_CODES.forEach((code) => {
      groups[code] = [];
    });

    nations.forEach((n) => {
      let confedKey = '';
      if (typeof n.confed === 'string') {
        confedKey = n.confed.toUpperCase();
      } else if (n.confed && typeof n.confed === 'object') {
        confedKey = (n.confed.code || n.confed.name || '').toUpperCase();
      } else if (n.confed_id) {
        confedKey = String(n.confed_id).toUpperCase();
      }

      if (ORDERED_CONFED_CODES.includes(confedKey)) {
        groups[confedKey].push(n);
      }
    });

    const nodes: DataNode[] = [];

    // ==========================================
    // 2. MÀN COMP:
    // Cấp 1: [ALL, WORLD, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL, WORLD): [International, ...[list nation theo châu lục]]
    // ==========================================
    if (currentMode === 'comp') {
      // Cấp 1: ALL
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          shortName: 'ALL',
          noTag: true,
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      // Cấp 1: WORLD (không có cấp 2)
      nodes.push({
        key: 'world',
        title: '[WORLD] World',
        code3: 'WORLD',
        shortName: 'World',
        isLeaf: true,
        className: 'tree-node-level-1',
        level: 1,
      } as any);

      // Cấp 1: AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA
      ORDERED_CONFED_CODES.forEach((confedKey) => {
        const list = groups[confedKey] || [];
        const sortedNations = [...list].sort((a, b) => {
          const nameA = a.name_sh || a.name || a.name_lg || '';
          const nameB = b.name_sh || b.name || b.name_lg || '';
          return nameA.localeCompare(nameB);
        });

        nodes.push({
          key: confedKey.toLowerCase(),
          title: getConfedTitle(confedKey),
          code3: confedKey,
          shortName: CONFED_DISPLAY_NAMES[confedKey] || confedKey,
          selectable: allowSelectConfed,
          className: 'tree-node-level-1',
          level: 1,
          children: [
            // Cấp 2 mục 1: International
            {
              key: `intl_${confedKey.toLowerCase()}`,
              title: '[INT] International',
              isLeaf: true,
              selectable: true,
              className: 'tree-node-level-2',
              level: 2,
              code3: 'INT',
              shortName: 'International',
              noTag: false,
              isInternational: true,
              confed: confedKey,
            },
            // Cấp 2 mục tiếp theo: Danh sách quốc gia theo châu lục
            ...sortedNations.map((n) => {
              const code = (n.name_3l || (n as any).code || (n as any).code3 || '---').toUpperCase();
              const shortName = n.name_sh || n.name || n.name_lg || '';
              return {
                key: String(n.id),
                title: `${code} ${shortName}`,
                isLeaf: true,
                selectable: true,
                className: 'tree-node-level-2',
                level: 2,
                nationData: n,
                code3: code,
                shortName: shortName,
              };
            }),
          ],
        } as any);
      });

      return nodes;
    }

    // ==========================================
    // 3. MÀN CLUB:
    // Cấp 1: [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL): [list nation theo châu lục]
    // Cấp 3: [...[list comp có club theo nation], Other, Extinct]
    // ==========================================
    if (currentMode === 'club') {
      // Cấp 1: ALL
      if (showAllOption) {
        nodes.push({
          key: 'all',
          title: 'ALL',
          isLeaf: true,
          className: 'tree-node-level-1',
          level: 1,
        } as any);
      }

      ORDERED_CONFED_CODES.forEach((confedKey) => {
        const list = groups[confedKey] || [];
        const sortedNations = [...list].sort((a, b) => {
          const nameA = a.name_sh || a.name || a.name_lg || '';
          const nameB = b.name_sh || b.name || b.name_lg || '';
          return nameA.localeCompare(nameB);
        });

        nodes.push({
          key: confedKey.toLowerCase(),
          title: getConfedTitle(confedKey),
          code3: confedKey,
          shortName: CONFED_DISPLAY_NAMES[confedKey] || confedKey,
          selectable: true,
          className: 'tree-node-level-1',
          level: 1,
          children: sortedNations.map((n) => {
            const nationId = String(n.id);
            const code = (n.name_3l || (n as any).code || (n as any).code3 || '---').toUpperCase();
            const shortName = n.name_sh || n.name || n.name_lg || '';

            // Cấp 3: Danh sách giải đấu nếu đã tải
            const cachedComps = nationCompsCache[nationId];
            let compChildren: DataNode[] | undefined = undefined;

            if (cachedComps !== undefined) {
              const compsWithClubs = cachedComps.filter((c: any) => {
                const clubCount = c.stats?.club ?? (c as any).clubs_count;
                return clubCount === undefined || clubCount > 0;
              });

              const sortedComps = [...compsWithClubs].sort((a, b) => {
                const nameA = a.name_sh || a.name || a.name_lg || '';
                const nameB = b.name_sh || b.name || b.name_lg || '';
                return nameA.localeCompare(nameB);
              });

              compChildren = [
                ...sortedComps.map((c) => ({
                  key: `comp_${c.id}`,
                  title: `${(c.name_3l || 'CMP').toUpperCase()} ${c.name_sh || c.name || c.name_lg || ''}`,
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  code3: (c.name_3l || 'CMP').toUpperCase(),
                  shortName: c.name_sh || c.name || c.name_lg || '',
                  compData: c,
                  nationId: nationId,
                } as any)),
                {
                  key: `oth_${nationId}`,
                  title: '[OTH] Other',
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  code3: 'OTH',
                  shortName: 'Other',
                  noTag: false,
                  nationId: nationId,
                  isOther: true,
                } as any,
                {
                  key: `ext_${nationId}`,
                  title: '[EXT] Extinct',
                  isLeaf: true,
                  selectable: true,
                  className: 'tree-node-level-3',
                  level: 3,
                  code3: 'EXT',
                  shortName: 'Extinct',
                  noTag: false,
                  nationId: nationId,
                  isExtinct: true,
                } as any,
              ];
            }

            return {
              key: `nation_${nationId}`,
              title: `${code} ${shortName}`,
              isLeaf: false, // Để có thể mở rộng cấp 3
              selectable: true,
              className: 'tree-node-level-2',
              level: 2,
              nationData: n,
              code3: code,
              shortName: shortName,
              confed: confedKey,
              children: compChildren,
            };
          }),
        } as any);
      });

      return nodes;
    }

    // ==========================================
    // 4. MÀN CITY, STADIUM (VÀ AWARD / DEFAULT):
    // Cấp 1: [ALL, AFC, CAF, CONCACAF, CONMEBOL, OFC, UEFA]
    // Cấp 2 (trừ ALL): [list nation theo châu lục]
    // ==========================================
    if (showAllOption) {
      nodes.push({
        key: 'all',
        title: 'ALL',
        code3: 'ALL',
        shortName: '',
        noTag: false,
        isLeaf: true,
        className: 'tree-node-level-1',
        level: 1,
      } as any);
    }

    ORDERED_CONFED_CODES.forEach((confedKey) => {
      const list = groups[confedKey] || [];
      const sortedNations = [...list].sort((a, b) => {
        const nameA = a.name_sh || a.name || a.name_lg || '';
        const nameB = b.name_sh || b.name || b.name_lg || '';
        return nameA.localeCompare(nameB);
      });

      nodes.push({
        key: confedKey.toLowerCase(),
        title: getConfedTitle(confedKey),
        code3: confedKey,
        shortName: CONFED_DISPLAY_NAMES[confedKey] || confedKey,
        selectable: true,
        className: 'tree-node-level-1',
        level: 1,
        children: sortedNations.map((n) => {
          const code = (n.name_3l || (n as any).code || (n as any).code3 || '---').toUpperCase();
          const shortName = n.name_sh || n.name || n.name_lg || '';
          return {
            key: String(n.id),
            title: `${code} ${shortName}`,
            isLeaf: true,
            selectable: true,
            className: 'tree-node-level-2',
            level: 2,
            nationData: n,
            code3: code,
            shortName: shortName,
            confed: confedKey,
          };
        }),
      } as any);
    });

    return nodes;
  }, [apiTreeData, currentMode, nations, showAllOption, allowSelectConfed, nationCompsCache]);

  // Lọc cây theo từ khóa tìm kiếm
  const filteredTreeData = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rawTreeData;

    const filterNodes = (items: DataNode[]): DataNode[] => {
      const result: DataNode[] = [];
      for (const item of items) {
        const titleStr = String((item as any).title || '').toLowerCase();
        const codeStr = String((item as any).code3 || '').toLowerCase();
        const shortStr = String((item as any).shortName || '').toLowerCase();
        const matches = titleStr.includes(q) || codeStr.includes(q) || shortStr.includes(q);

        if (item.children && item.children.length > 0) {
          const matchedChildren = filterNodes(item.children);
          if (matches || matchedChildren.length > 0) {
            result.push({
              ...item,
              children: matchedChildren.length > 0 ? matchedChildren : item.children,
            });
          }
        } else if (matches) {
          result.push(item);
        }
      }
      return result;
    };

    const filtered = filterNodes(rawTreeData);
    const allNode = rawTreeData.find((item) => {
      const node = item as any;
      return (
        String(node.key || '').toLowerCase() === 'all' ||
        String(node.code3 || '').toUpperCase() === 'ALL' ||
        String(node.title || '').toUpperCase() === 'ALL'
      );
    });

    if (!allNode) return filtered;

    return [
      allNode,
      ...filtered.filter((item) => String(item.key).toLowerCase() !== String(allNode.key).toLowerCase()),
    ];
  }, [rawTreeData, keyword]);

  // Ant Design Tree is single-select here, so always pass exactly one key that
  // matches the key casing returned by the API (confederation keys are lowercase).
  const actualSelectedKey = useMemo(
    () => findActualTreeKey(rawTreeData, selectedKey),
    [rawTreeData, selectedKey],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);
    if (val.trim()) {
      const allParentKeys: React.Key[] = [];
      const collectKeys = (nodes: DataNode[]) => {
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            allParentKeys.push(node.key);
            collectKeys(node.children);
          }
        });
      };
      collectKeys(rawTreeData);
      setExpandedKeys(allParentKeys);
      setAutoExpandParent(true);
    }
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const key = String(selectedKeys && selectedKeys.length > 0 ? selectedKeys[0] : info?.node?.key || '');
    if (!key) return;

    const lk = key.toLowerCase();
    const isConfed =
      key.startsWith('confed_') ||
      ORDERED_CONFED_CODES.map((c) => c.toLowerCase()).includes(lk) ||
      ORDERED_CONFED_CODES.includes(key.toUpperCase());

    // Tự động mở rộng nhánh khi người dùng chọn mục có nhánh con
    if (isConfed || key.startsWith('nation_') || (info?.node?.children && info.node.children.length > 0)) {
      setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }

    // Nếu ở màn club click vào nation: tự động tải Cấp 3 nếu dùng local fallback
    if (currentMode === 'club' && key.startsWith('nation_')) {
      const nid = key.replace('nation_', '');
      if (!apiTreeData && nid && nationCompsCache[nid] === undefined) {
        fetchDomesticCompetitions(nid, { size: 100 })
          .then((res: any) => {
            const list = Array.isArray(res) ? res : res?.content || [];
            const regularComps = list.filter(
              (c: any) => !c.is_virtual && !String(c.id).startsWith('oth-') && !String(c.id).startsWith('ext-')
            );
            setNationCompsCache((prev) => ({
              ...prev,
              [nid]: regularComps,
            }));
          })
          .catch(() => {});
      }
    }

    onSelectNode(key, info.node);
  };

  const isFullHeight = height === '100%' || height === 'full';

  return (
    <div className={`flex flex-col min-h-0 ${isFullHeight ? 'h-full flex-1' : 'space-y-2.5'} ${className}`}>
      {/* Ô tìm kiếm đơn vị chuẩn theo hình mẫu */}
      <div className="shrink-0 mb-2">
        <Input.Search
          placeholder="Search"
          value={keyword}
          onChange={handleSearchChange}
          onSearch={(val) => setKeyword(val)}
          allowClear
          className="w-full"
        />
      </div>

      {/* Khung hiển thị Cây đơn vị */}
      <div
        style={isFullHeight ? undefined : { height, minHeight: height, maxHeight: height }}
        className={`overflow-y-auto mobile-frame-scroll border border-slate-200/80 rounded-lg p-1 bg-white relative ${
          isFullHeight ? 'flex-1 min-h-0 h-full' : ''
        }`}
      >
        {loadingTree && !apiTreeData && nations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
            <Spin size="small" className="mb-2" />
            <span>Loading unit tree...</span>
          </div>
        ) : (
          <Tree
            virtual={false}
            blockNode
            showLine={{ showLeafIcon: false }}
            treeData={filteredTreeData}
            loadData={currentMode === 'club' && !apiTreeData ? handleLoadData : undefined}
            selectedKeys={actualSelectedKey !== undefined ? [actualSelectedKey] : []}
            expandedKeys={expandedKeys}
            autoExpandParent={autoExpandParent}
            onExpand={(keys) => {
              setExpandedKeys(keys);
              setAutoExpandParent(false);
            }}
            onSelect={handleSelect}
            switcherIcon={(props: any) =>
              props.isLeaf ? null : props.expanded ? (
                <DownOutlined className="text-[10px] text-slate-500" />
              ) : (
                <RightOutlined className="text-[10px] text-slate-500" />
              )
            }
          titleRender={(node: any) => {
            const isSelected = Boolean(
              selectedKey &&
                (String(selectedKey) === String(node.key) ||
                  (node.level === 1 && String(selectedKey).toLowerCase() === String(node.key).toLowerCase()))
            );
            const isLevel1 = node.level === 1;

            // Extract tag and text
            let tag = node.code3 || '';
            let text = node.shortName || '';

            // If tag/text not explicitly provided, extract from "[TAG] Text" pattern
            if (!tag && typeof node.title === 'string') {
              const match = node.title.match(/^\[([A-Za-z0-9_-]+)\]\s*(.*)$/);
              if (match) {
                tag = match[1];
                text = match[2];
              }
            }

            if (!text) {
              text = node.shortName || node.nationData?.name_sh || node.nationData?.name || node.title || '';
            }

            const isAll = Boolean(
              String(node.key).toLowerCase() === 'all' ||
              tag === 'ALL' ||
              text === 'ALL' ||
              node.title === 'ALL'
            );

            const isIntl = Boolean(
              !isAll && (
                node.isInternational ||
                String(node.key).startsWith('intl_') ||
                tag === 'INT' ||
                text === 'International'
              )
            );

            const isOth = Boolean(
              !isAll && (
                node.isOther ||
                String(node.key).startsWith('oth_') ||
                tag === 'OTH' ||
                text === 'Other'
              )
            );

            const isExt = Boolean(
              !isAll && (
                node.isExtinct ||
                String(node.key).startsWith('ext_') ||
                String(node.key) === 'extinct' ||
                tag === 'EXT' ||
                tag === 'EXTINCT' ||
                text === 'Extinct'
              )
            );

            if (isAll) {
              tag = 'ALL';
              text = '';
            } else if (isIntl) {
              tag = 'INT';
              text = 'International';
            } else if (isOth) {
              tag = 'OTH';
              text = 'Other';
            } else if (isExt) {
              tag = 'EXT';
              text = 'Extinct';
            }

            const isSpecial = isAll || isIntl || isOth || isExt;

            const hideTag = Boolean(
              !isSpecial && (node.noTag || !tag)
            );

            let tagColorClass = isSelected
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-slate-100 text-slate-600 border-slate-200';

            if (isAll) {
              tagColorClass = isSelected
                ? 'bg-amber-100 text-amber-800 border-amber-400 font-bold ring-1 ring-amber-300'
                : 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
            } else if (isIntl) {
              tagColorClass = isSelected
                ? 'bg-emerald-100 text-emerald-800 border-emerald-400 font-semibold'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300';
            } else if (isOth) {
              tagColorClass = isSelected
                ? 'bg-orange-100 text-orange-800 border-orange-400 font-semibold'
                : 'bg-orange-50 text-orange-700 border-orange-300';
            } else if (isExt) {
              tagColorClass = isSelected
                ? 'bg-red-100 text-red-800 border-red-400 font-semibold'
                : 'bg-red-50 text-red-700 border-red-300';
            }

            return (
              <span className={`flex items-center justify-between w-full min-w-0 pr-1 select-none text-xs ${isLevel1 ? 'font-semibold' : ''}`}>
                <span className="inline-flex items-center gap-1.5 min-w-0 flex-1">
                  {!hideTag && tag && (
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider flex-shrink-0 border leading-none ${tagColorClass}`}
                    >
                      {tag}
                    </span>
                  )}
                  {text ? (
                    <span className={`whitespace-normal break-words leading-tight ${isSelected ? 'font-semibold text-blue-700' : ''}`}>
                      {text}
                    </span>
                  ) : null}
                </span>
                {isSelected && (
                  <CheckOutlined className="text-blue-600 text-xs shrink-0 ml-auto pl-1.5 mt-0.5" />
                )}
              </span>
            );
          }}
          className="unit-tree-directory text-xs"
        />
        )}
      </div>
    </div>
  );
}
