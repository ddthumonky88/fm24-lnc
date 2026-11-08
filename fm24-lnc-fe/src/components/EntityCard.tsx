'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Button, Tooltip, Popconfirm, Dropdown, App } from 'antd';
import {
  SafetyOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  FlagOutlined,
  EyeOutlined,
  BranchesOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  EllipsisOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import { EntityType } from '../types';
import { getConfederationLogoUrl, getLocalFlagUrl } from '../services/api';
import RecordDetailModal from './RecordDetailModal';
import {
  NationIcon,
  IntCompIcon,
  DomesticCompIcon,
  ClubIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from './EntityIcons';

export { EntityType };

export interface EntityCardField {
  label: React.ReactNode;
  value: React.ReactNode;
  isInactive?: boolean;
  isRed?: boolean;
  lineClamp?: number;
  align?: 'start' | 'baseline' | 'center';
  title?: string;
}

export interface EntityCardProps {
  type: EntityType | string;
  data: any;
  values?: EntityCardField[];
  cardSize?: 'small' | 'large';
  largeStyle?: '1-line' | '2-line';
  cardStyle?: '1-line' | '2-line';
  onNavigate?: (step: any) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onViewChildren?: (record: any) => void;
}

const formatCode = (code?: string | null) => {
  if (
    !code ||
    typeof code !== 'string' ||
    code.trim() === '' ||
    code.trim().toUpperCase() === 'UNK'
  ) {
    return null;
  }
  return code.trim();
};

export function formatCategoryCode(categoryStr?: string | null): string {
  if (!categoryStr || typeof categoryStr !== 'string') return '';
  const trimmed = categoryStr.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase().replace(/^\[/, '').replace(/\]$/, '');
  if (
    upper === 'CUP' ||
    upper === 'YTH' ||
    upper === 'OTH' ||
    upper === 'EXT' ||
    /^L\d+$/.test(upper) ||
    upper === 'L'
  ) {
    return upper;
  }

  const lower = trimmed.toLowerCase();

  // 0. Extinct => EXT
  if (lower.includes('extinct')) {
    return 'EXT';
  }

  // 1. Youth => YTH
  if (
    lower.includes('youth') ||
    lower.includes('u21') ||
    lower.includes('u19') ||
    lower.includes('u18') ||
    lower.includes('u23')
  ) {
    return 'YTH';
  }

  // 2. Cup => CUP
  if (lower.includes('cup')) {
    return 'CUP';
  }

  // 3. League (n) => Ln
  const leagueMatch =
    trimmed.match(/league\s*\(\s*(\d+)\s*\)/i) ||
    trimmed.match(/\((\d+)\)/) ||
    trimmed.match(/league\s*(\d+)/i) ||
    trimmed.match(/tier\s*(\d+)/i) ||
    trimmed.match(/division\s*(\d+)/i);

  if (leagueMatch) {
    return `L${leagueMatch[1]}`;
  }

  if (
    lower.includes('league') ||
    lower.includes('division') ||
    lower.includes('tier') ||
    lower.includes('lower leagues')
  ) {
    return 'L';
  }

  // 4. Other => OTH
  return 'OTH';
}

export function getCategoryTagColor(
  categoryStr?: string | null,
  isRedFn?: (val?: any) => boolean,
): string {
  if (!categoryStr) return 'default';
  const upper = String(categoryStr).trim().toUpperCase();
  if (upper.includes('EXTINCT') || upper.includes('REMOVE')) {
    return 'error';
  }
  const code = formatCategoryCode(categoryStr);
  if (code.startsWith('L') || code.startsWith('[L')) return 'blue';
  if (code === 'CUP' || code === '[CUP]') return 'green';
  if (code === 'YTH' || code === '[YTH]') return 'purple';
  if (isRedFn && isRedFn(categoryStr)) return 'error';
  return 'default';
}

export default function EntityCard({
  type,
  data,
  values,
  cardSize,
  largeStyle = '1-line',
  cardStyle,
  onNavigate,
  onEdit,
  onDelete,
  onViewChildren,
}: EntityCardProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [idCopied, setIdCopied] = useState(false);
  const isNewRecord = /^n-\d+$/i.test(String(data?.id ?? ''));
  const clubAffiliate = data?.affiliate || data?.affiliate_club;
  const clubAffiliateType = String(clubAffiliate?.type || data?.affiliate_club_type || '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim();
  const clubAffiliateName =
    clubAffiliate?.name_sh || clubAffiliate?.name_lg || clubAffiliate?.name || null;

  const entityTypeStr = String(type).toLowerCase();
  const isComp =
    entityTypeStr === 'competition' ||
    entityTypeStr === 'comp' ||
    entityTypeStr === 'international_competition' ||
    type === EntityType.COMPETITION;

  const competitionTypeBadge = (() => {
    if (!isComp || !data.type) return null;
    const competitionType = String(data.type).trim();
    const league = competitionType.match(/^Domestic League(?:\s*\(([^)]+)\))?/i);
    if (league) return league[1] ? `L-${league[1].trim()}` : 'L';
    if (/^Domestic Cup$/i.test(competitionType)) return 'CUP';
    const youth = competitionType.match(/^Youth Competitions?(?:\s*\(([^)]+)\))?/i);
    if (youth) return youth[1] ? `Y-${youth[1].trim()}` : 'Y';
    if (/^Other Competitions?$/i.test(competitionType)) return 'OTH';
    if (/^Extinct/i.test(competitionType)) return 'EXT';
    return null;
  })();

  const isSmall =
    cardSize !== undefined
      ? cardSize === 'small'
      : entityTypeStr === 'nation' ||
        entityTypeStr === 'stadium' ||
        entityTypeStr === 'city';

  const is2Line = isComp || (!isSmall && (largeStyle === '2-line' || cardStyle === '2-line'));

  const isRedKeyword = (val?: any): boolean => {
    if (!val || typeof val !== 'string') return false;
    const upper = val.trim().toUpperCase();
    return (
      upper === '[EXTINCT]' ||
      upper === '[REMOVE]' ||
      upper === 'EXTINCT' ||
      upper === 'REMOVE' ||
      upper.startsWith('[EXTINCT]') ||
      upper.startsWith('[REMOVE]')
    );
  };

  const isSpecialCard = Boolean(
    data.is_virtual ||
    data.id === '[EXTINCT]' ||
    data.id === '[OTHER]' ||
    data.id === '[REMOVE]' ||
    data.virtual_type === 'EXTINCT' ||
    data.virtual_type === 'OTHER' ||
    data.virtual_type === 'REMOVE' ||
    (typeof data.id === 'string' && data.id.startsWith('[')),
  );

  const isCityRemove =
    entityTypeStr === 'city' &&
    Boolean(
      data.is_remove ||
      (typeof data.name === 'string' && data.name.trim() === '-') ||
      isRedKeyword(data.region?.name || data.region || data.region_name) ||
      isRedKeyword(data.categories) ||
      isRedKeyword(data.category) ||
      (typeof (data.region?.name || data.region || data.region_name) === 'string' && String(data.region?.name || data.region || data.region_name).toUpperCase().includes('[REMOVE]'))
    );

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpecialCard) return;
    if (data.id !== undefined && data.id !== null) {
      navigator.clipboard.writeText(String(data.id));
      setIdCopied(true);
      message.success(`Copied ID: ${data.id}`);
      setTimeout(() => setIdCopied(false), 2000);
    }
  };

  // Determine Type Icon and badge styling
  const getIcon = () => {
    if (data.is_virtual) {
      return (
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
            data.virtual_type === 'EXTINCT'
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-blue-50 border border-blue-200 text-blue-600'
          }`}
        >
          <SafetyOutlined />
        </span>
      );
    }
    switch (type) {
      case EntityType.CONFEDERATION:
      case 'confederation': {
        const confedLogo = getConfederationLogoUrl(data.id);
        return (
          <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
            {confedLogo ? (
              <img
                src={confedLogo}
                alt={data.name || 'Confederation'}
                className="w-6 h-6 object-contain rounded bg-white shadow-2xs border border-slate-200"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              style={{ display: confedLogo ? 'none' : 'flex' }}
              className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 items-center justify-center text-xs font-bold text-blue-700"
            >
              {data.name ? data.name[0] : 'C'}
            </span>
          </div>
        );
      }
      case EntityType.NATION:
      case 'nation':
        return (
          <span className="w-7 h-7 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <NationIcon size={16} />
          </span>
        );
      case EntityType.COMPETITION:
      case 'competition': {
        const isInter = Boolean(data.is_international || !data.nation_id);
        if (isInter) {
          return (
            <span className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <IntCompIcon size={16} />
            </span>
          );
        }
        return (
          <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <DomesticCompIcon size={16} />
          </span>
        );
      }
      case EntityType.CLUB:
      case 'club':
        return (
          <span className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <ClubIcon size={16} />
          </span>
        );
      case EntityType.STADIUM:
      case 'stadium':
        return (
          <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <StadiumIcon size={16} />
          </span>
        );
      case EntityType.CITY:
      case 'city':
        return (
          <span className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
            <CityIcon size={16} />
          </span>
        );
      case EntityType.AWARD:
      case 'award':
        return (
          <span className="w-7 h-7 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-yellow-600">
            <AwardIcon size={16} />
          </span>
        );
      case EntityType.PLAYER:
      case 'player':
        return (
          <span className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-xs text-purple-600">
            <UserOutlined />
          </span>
        );
    }
  };

  const code3 = formatCode(data.name_3l);
  const code6 = formatCode(data.name_6l);
  const title =
    type === EntityType.PLAYER
      ? `${data.first_name || ''} ${data.second_name || ''}`.trim() ||
        data.common_name ||
        'Unnamed Player'
      : data.name_lg || data.name || 'Unnamed';
  const subtitle =
    type === EntityType.PLAYER
      ? data.common_name
        ? `"${data.common_name}"`
        : 'Person / Player'
      : data.name_sh || '';
  const hasThreeLetter =
    [
      EntityType.NATION,
      EntityType.COMPETITION,
      EntityType.CLUB,
    ].includes(type as any) ||
    'name_3l' in data;

  const inactiveList = (data.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  const isInactive = (field: string) => inactiveList.includes(field.toLowerCase());

  const canEdit =
    onEdit &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    !data.is_virtual;
  const canDelete =
    onDelete &&
    type !== EntityType.CONFEDERATION &&
    type !== EntityType.NATION &&
    !data.is_virtual;

  const isTitleInactive =
    isInactive('name_lg') || isInactive('name');

  const showsNationFlag = entityTypeStr === 'city' || entityTypeStr === 'club';
  const entityNationFlagUrl =
    showsNationFlag && data.nation?.name_3l
      ? getLocalFlagUrl(data.nation.name_3l)
      : null;


  const isNavigable = Boolean(
    data.is_virtual ||
      type === EntityType.NATION ||
      type === 'nation' ||
      type === EntityType.COMPETITION ||
      type === 'competition' ||
      (type === EntityType.CLUB || type === 'club' ? Boolean(data.id && !isSpecialCard) : false) ||
      (type === EntityType.CITY || type === 'city' ? Boolean(data.id) : false) ||
      (type === EntityType.STADIUM || type === 'stadium' ? Boolean(data.id) : false) ||
      (type === EntityType.AWARD || type === 'award' ? Boolean(data.id) : false) ||
      (type === EntityType.CONFEDERATION || type === 'confederation'
        ? (data.totalNations || 0) > 0
        : false),
  );

  const handleNavigateAction = () => {
    if (isInfoOpen) return;
    if (data.is_virtual) {
      if (!onNavigate) return;
      const isExtinct =
        data.virtual_type === 'EXTINCT' ||
        String(data.id).startsWith('ext-') ||
        data.id === '[EXTINCT]';
      const nId =
        data.nation_id ||
        (typeof data.id === 'string' && data.id.includes('-')
          ? data.id.split('-')[1]
          : undefined);
      const fakeId = isExtinct ? `ext-${nId}` : `oth-${nId}`;
      onNavigate({
        level: 'INDEPENDENT_CLUBS',
        id: fakeId,
        virtualId: data.id,
        nationId: nId,
        title: data.name_lg || data.name_sh || title,
        metadata: { is_extinct: isExtinct, nation_id: nId },
      });
    } else if (type === EntityType.NATION) {
      const count = data.totalComps !== undefined ? data.totalComps : data.totalChildren;
      if (onNavigate) {
        onNavigate({
          level: 'NATION_HUB',
          id: data.id,
          title: `[${data.name_3l || ''}] ${data.name_lg || data.name || ''}`,
        });
      } else if (data.id) {
        router.push(`/nation/${data.id}`);
      }
    } else if (type === EntityType.COMPETITION) {
      const clubsCnt = data.clubsCount ?? data.stats?.club ?? 0;
      const awardsCnt = data.awardsCount ?? data.stats?.award ?? 0;
      if (onNavigate) {
        if (clubsCnt > 0) {
          onNavigate({
            level: 'CLUBS_IN_COMP',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''}`,
          });
        } else if (awardsCnt > 0) {
          onNavigate({
            level: 'COMP_AWARDS',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''} - Awards`,
          });
        } else {
          onNavigate({
            level: 'CLUBS_IN_COMP',
            id: data.id,
            title: `${data.name_sh || data.name_lg || data.name || ''}`,
          });
        }
      } else if (data.id) {
        router.push(`/comp/${data.id}`);
      }
    } else if (type === EntityType.CLUB || type === 'club') {
      if (!isSpecialCard && data.id) {
        if (onNavigate) {
          onNavigate({
            type: 'club',
            id: data.id,
            title: data.name_sh || data.name_lg || data.name || '',
          });
        } else {
          router.push(`/club/${data.id}`);
        }
      }
    } else if (type === EntityType.CITY || type === 'city') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'city', id: data.id, title: data.name_lg || data.name || '' });
        } else {
          router.push(`/city/${data.id}`);
        }
      }
    } else if (type === EntityType.STADIUM || type === 'stadium') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'stadium', id: data.id, title: data.name || '' });
        } else {
          router.push(`/stadium/${data.id}`);
        }
      }
    } else if (type === EntityType.AWARD || type === 'award') {
      if (data.id) {
        if (onNavigate) {
          onNavigate({ type: 'award', id: data.id, title: data.name_lg || data.name || '' });
        } else {
          router.push(`/award/${data.id}`);
        }
      }
    }
  };

  const actionMenuItems: any[] = [
    {
      key: 'navigate',
      icon: <EyeOutlined className="text-blue-600" />,
      label: 'View details',
      onClick: (e: any) => {
        e?.domEvent?.stopPropagation();
        handleNavigateAction();
      },
    },
    ...(!isSpecialCard
      ? [
          {
            key: 'info',
            icon: <InfoCircleOutlined className="text-sky-500" />,
            label: 'Quick info (Modal)',
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              setModalMode('view');
              setIsInfoOpen(true);
            },
          },
        ]
      : []),
    ...(data.childrenCount || data.children_count
      ? [
          {
            key: 'subcomps',
            icon: <BranchesOutlined className="text-amber-500" />,
            label: `Sub-competitions (${data.childrenCount || data.children_count})`,
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onViewChildren?.(data);
            },
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            key: 'edit',
            icon: <EditOutlined className="text-emerald-600" />,
            label: 'Edit',
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onEdit(data);
            },
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            key: 'delete',
            icon: <DeleteOutlined className="text-red-500" />,
            label: 'Delete',
            danger: true,
            onClick: (e: any) => {
              e?.domEvent?.stopPropagation();
              onDelete(data);
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <div
        onClick={(e) => {
          if (isInfoOpen) {
            e.stopPropagation();
            return;
          }
          handleNavigateAction();
        }}
        className={`${
          isCityRemove
            ? 'bg-red-50/70 hover:bg-red-100/60 border border-red-200/80 hover:border-red-400'
            : isNewRecord
              ? 'bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-300/90 hover:border-emerald-500'
              : 'bg-blue-50/70 hover:bg-blue-50 border border-blue-200/80 hover:border-blue-400'
        } rounded-lg ${
          isSmall ? 'px-2.5 py-2' : 'px-3 py-2 sm:px-3.5 sm:py-2.5'
        } shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between group h-full ${
          isNavigable ? 'cursor-pointer' : ''
        }`}
      >
        <div>
          {/* Top Header Bar: chỉ gồm [Thẻ ID] và [btn 3 chấm] */}
          <div className={`flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b ${isCityRemove ? 'border-red-200/60' : isNewRecord ? 'border-emerald-300/70' : 'border-blue-200/60'} min-w-0`}>
            <div className="flex items-center gap-1.5 min-w-0">
                {entityNationFlagUrl && (
                  <Tooltip title={data.nation?.name || data.nation?.name_sh || data.nation?.name_lg || 'Nation'}>
                    <img
                      src={entityNationFlagUrl}
                      alt={data.nation?.name || data.nation?.name_sh || data.nation?.name_lg || 'Nation flag'}
                      className="h-4 w-6 shrink-0 rounded-[3px] border border-black/10 bg-white object-cover shadow-2xs"
                      onClick={(event) => event.stopPropagation()}
                      onError={(event) => {
                        if (!event.currentTarget.dataset.fallbackAttempted) {
                          event.currentTarget.dataset.fallbackAttempted = 'true';
                          event.currentTarget.src = getLocalFlagUrl(data.nation?.name_3l, true);
                        } else {
                          event.currentTarget.style.display = 'none';
                        }
                      }}
                    />
                  </Tooltip>
                )}
                {data.id !== undefined && data.id !== null && data.id !== '' && (
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center shrink-0">
                    {isSpecialCard ? (
                      <Tag
                        style={{
                          border:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '1px solid #f87171'
                              : '1px solid #cbd5e1',
                          color:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '#dc2626'
                              : '#334155',
                          backgroundColor:
                            isRedKeyword(data.id) || isRedKeyword(data.virtual_type)
                              ? '#fef2f2'
                              : '#ffffff',
                        }}
                        className="m-0 font-mono font-bold text-xs shrink-0 select-none py-0 px-1.5 leading-tight shadow-2xs"
                      >
                        {data.id === '[REMOVE]' || data.id === 'REMOVE' ? (
                          <CloseCircleOutlined className="text-red-500" />
                        ) : (
                          String(data.id).replace(/^\[/, '').replace(/\]$/, '')
                        )}
                      </Tag>
                    ) : (
                      <Tooltip
                        title={idCopied ? 'Copied!' : 'Click to copy ID'}
                        trigger="hover"
                        destroyOnHidden
                      >
                        <Tag
                          onClick={handleCopyId}
                          style={{
                            border: isRedKeyword(data.id) || isCityRemove
                              ? '1px solid #f87171'
                              : isNewRecord
                                ? '1px solid #34d399'
                              : '1px solid #60a5fa',
                            color: isRedKeyword(data.id) || isCityRemove
                              ? '#dc2626'
                              : isNewRecord
                                ? '#047857'
                                : '#1d4ed8',
                            backgroundColor: isRedKeyword(data.id) || isCityRemove
                              ? '#fef2f2'
                              : isNewRecord
                                ? 'rgba(209, 250, 229, 0.9)'
                              : 'rgba(239, 246, 255, 0.85)',
                          }}
                          className="m-0 font-mono font-bold text-xs hover:opacity-85 cursor-pointer select-all transition-all inline-flex items-center gap-1 shrink-0 py-0.5 px-2 leading-tight shadow-2xs"
                          title={
                            data.is_virtual ||
                            data.id === '[EXTINCT]' ||
                            data.id === '[OTHER]' ||
                            data.id === '[REMOVE]'
                              ? data.virtual_type === 'EXTINCT' || data.id === '[EXTINCT]'
                                ? 'Extinct Clubs'
                                : data.id === '[REMOVE]' || data.virtual_type === 'REMOVE'
                                  ? 'Removed Records'
                                  : 'Other Clubs (Unassigned)'
                              : undefined
                          }
                        >
                          <span>
                            {data.id === '[REMOVE]' || data.id === 'REMOVE' ? (
                              <CloseCircleOutlined className="text-red-500" />
                            ) : (
                              String(data.id).replace(/^\[/, '').replace(/\]$/, '')
                            )}
                          </span>
                          {idCopied ? (
                            <CheckOutlined className="text-emerald-500 text-[10px]" />
                          ) : (
                            <CopyOutlined className={`text-[10px] ${isCityRemove ? 'text-red-400 hover:text-red-600' : isNewRecord ? 'text-emerald-500 hover:text-emerald-700' : 'text-blue-500 hover:text-blue-700'}`} />
                          )}
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                )}
                {competitionTypeBadge && (
                  <Tooltip title={String(data.type)}>
                    <Tag
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        border: '1px solid #a78bfa',
                        color: '#6d28d9',
                        backgroundColor: 'rgba(245, 243, 255, 0.9)',
                      }}
                      className="m-0 font-mono font-bold text-xs inline-flex items-center shrink-0 py-0.5 px-2 leading-tight shadow-2xs select-none"
                    >
                      {competitionTypeBadge}
                    </Tag>
                  </Tooltip>
                )}
            </div>
            <div className="flex items-center ml-auto shrink-0">
              <Dropdown
                menu={{ items: actionMenuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  icon={
                    <EllipsisOutlined
                      style={{ fontSize: 16 }}
                      className="text-slate-500 hover:text-blue-600 transition-colors"
                    />
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement)?.blur();
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-blue-100/70 rounded-full cursor-pointer"
                />
              </Dropdown>
            </div>
          </div>

          {/* Fields List formatted as [label]: [value] (1:3 ratio) with support for custom values or type-based defaults */}
          {(() => {
            // Determine default fields list based on entity type and data
            const getDefaultFields = (): EntityCardField[] => {
              const fields: EntityCardField[] = [];
              const entityTypeStr = String(type).toLowerCase();

              // Specific Entity Type Fields
              if (entityTypeStr === 'player') {
                fields.push({
                  label: 'F-NAME:',
                  value: data.first_name || '-',
                });
                fields.push({
                  label: 'S-NAME:',
                  value: data.second_name || '-',
                });
                if (data.common_name) {
                  fields.push({
                    label: 'C-NAME:',
                    value: (
                      <span className="font-bold text-[12px] leading-snug truncate text-gray-700 italic min-w-0 block">
                        {data.common_name}
                      </span>
                    ),
                  });
                }
              } else if (entityTypeStr === 'city') {
                const isTitleRemove =
                  title === '-' ||
                  title === '[REMOVE]' ||
                  (typeof title === 'string' && title.trim().toUpperCase() === '[REMOVE]');
                fields.push({
                  label: 'NAME:',
                  value: isTitleRemove ? (
                    <Tooltip title="[REMOVE]" trigger="hover" destroyOnHidden>
                      <span className="inline-flex items-center text-red-500 text-[14px]">
                        <CloseCircleOutlined />
                      </span>
                    </Tooltip>
                  ) : (
                    title
                  ),
                  align: 'start',
                  lineClamp: 3,
                  isInactive: isInactive('name') || isTitleInactive,
                  isRed: isRedKeyword(title) || isCityRemove,
                });
                let regionVal = data.region?.name || data.region_name || data.region;
                if (regionVal) {
                  const cleaned = String(regionVal).replace(/^\[[^\]]+\]\s*/, '').trim();
                  const displayRegion = cleaned || regionVal;
                  const isRegionRemove =
                    displayRegion === '[REMOVE]' ||
                    String(regionVal).trim().toUpperCase() === '[REMOVE]' ||
                    String(displayRegion).trim().toUpperCase() === '[REMOVE]' ||
                    String(regionVal).trim().toUpperCase().startsWith('[REMOVE]');

                  fields.push({
                    label: 'REGION:',
                    value: isRegionRemove ? (
                      <Tooltip title="[REMOVE]" trigger="hover" destroyOnHidden>
                        <span className="inline-flex items-center text-red-500 text-[14px]">
                          <CloseCircleOutlined />
                        </span>
                      </Tooltip>
                    ) : (
                      displayRegion
                    ),
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('region'),
                    isRed: isRedKeyword(displayRegion) || isCityRemove,
                  });
                }
              } else if (entityTypeStr === 'stadium') {
                fields.push({
                  label: 'NAME:',
                  value: title,
                  align: 'start',
                  lineClamp: 3,
                  isInactive: isInactive('name') || isTitleInactive,
                  isRed: isRedKeyword(title),
                });
              } else if (entityTypeStr === 'club') {
                fields.push({
                  label: 'L-NAME:',
                  value: data.is_virtual ? '-' : data.name_lg || title,
                  align: 'start',
                  lineClamp: 2,
                  isInactive:
                    isInactive('name_lg') ||
                    isInactive('name') ||
                    isTitleInactive,
                  isRed: isRedKeyword(data.name_lg || title),
                });

                if (hasThreeLetter || data.name_sh || data.is_virtual) {
                  fields.push({
                    label: 'S-NAME:',
                    value: data.is_virtual ? '-' : data.name_sh || title,
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('name_sh'),
                    isRed: isRedKeyword(data.name_sh || title),
                  });
                }

                fields.push({
                  label: '6L-NAME:',
                  value: code6 || '-',
                  isInactive: isInactive('name_6l'),
                });

                fields.push({
                  label: '3L-NAME:',
                  value: data.is_virtual ? '-' : code3 || '-',
                  isInactive: isInactive('name_3l'),
                });

                if (clubAffiliateType || clubAffiliateName) {
                  fields.push({
                    label: 'AFFILIATE:',
                    value: (
                      <Tooltip title={clubAffiliateName ? `${clubAffiliateType || 'Affiliate'}: ${clubAffiliateName}` : `Affiliate type: ${clubAffiliateType}`}>
                        <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                          {clubAffiliateType && (
                            <Tag
                              color="cyan"
                              className="m-0 !border !border-cyan-300 font-mono text-[10px] font-bold"
                            >
                              {clubAffiliateType}
                            </Tag>
                          )}
                          {clubAffiliateName && (
                            <span className="truncate text-[11px] font-semibold text-cyan-800">
                              {clubAffiliateName}
                            </span>
                          )}
                        </span>
                      </Tooltip>
                    ),
                  });
                }

                if (data.affiliatesCount && data.affiliatesCount > 0) {
                  fields.push({
                    label: 'TEAMS:',
                    value: `${data.affiliatesCount} affiliates`,
                    align: 'start',
                  });
                }
              } else if (entityTypeStr === 'region') {
                fields.push({
                  label: 'NAME:',
                  value: data.name || title,
                  align: 'start',
                  lineClamp: 2,
                });
                if (data.code) {
                  fields.push({
                    label: 'CODE:',
                    value: data.code,
                  });
                }
                if (data.citiesCount !== undefined) {
                  fields.push({
                    label: 'CITIES:',
                    value: `${data.citiesCount} cities`,
                  });
                }
              } else {
                // Default: Competition, Nation, Award, Confederation, etc.
                const lnValue = data.name_lg || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : title);
                fields.push({
                  label: 'L-NAME:',
                  value: lnValue,
                  align: 'start',
                  lineClamp: 2,
                  isInactive:
                    isInactive('name_lg') ||
                    isInactive('name') ||
                    isTitleInactive,
                  isRed: isRedKeyword(lnValue),
                });

                if (hasThreeLetter || data.name_sh || data.is_virtual) {
                  const snValue = data.name_sh || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : title);
                  fields.push({
                    label: 'S-NAME:',
                    value: snValue,
                    align: 'start',
                    lineClamp: 2,
                    isInactive: isInactive('name_sh'),
                    isRed: isRedKeyword(snValue),
                  });
                }

                if (
                  entityTypeStr !== 'award' &&
                  (hasThreeLetter ||
                    data.name_3l ||
                    data.is_virtual)
                ) {
                  const val3 = data.name_3l || code3 || (data.is_virtual ? (data.virtual_type === 'EXTINCT' ? '[EXTINCT]' : '[OTHER]') : '-');
                  fields.push({
                    label: '3L-NAME:',
                    value: val3,
                    isInactive: isInactive('name_3l'),
                    isRed: isRedKeyword(val3),
                  });
                }
              }

              return fields;
            };

            const renderedFields: EntityCardField[] = values || getDefaultFields();
            const bodyMinHeightClass =
              entityTypeStr === 'nation' || entityTypeStr === 'city'
                ? 'min-h-[140px]'
                : entityTypeStr === 'stadium'
                  ? 'min-h-[90px]'
                  : entityTypeStr === 'club'
                    ? 'min-h-[160px]'
                    : isComp
                      ? 'min-h-[150px]'
                      : 'min-h-[120px]';

            return (
              /* Fields List: Stack label on top of value for small/2-column cards; 1-line (1:3 ratio) for large */
              <div
                className={`flex flex-col gap-1.5 mb-1 text-[12px] ${bodyMinHeightClass} justify-start`}
              >
                {renderedFields.map((field, idx) => {
                  const isNode = React.isValidElement(field.value);
                  const isRemoveVal =
                    typeof field.value === 'string' &&
                    (field.value.trim().toUpperCase() === '[REMOVE]' ||
                      field.value.trim().toUpperCase() === 'REMOVE');

                  const removeIconNode = isRemoveVal ? (
                    <Tooltip title="[REMOVE]" trigger="hover" destroyOnHidden>
                      <span className="inline-flex items-center text-red-500 text-[14px]">
                        <CloseCircleOutlined />
                      </span>
                    </Tooltip>
                  ) : null;

                  // 2 Line layout (Small card / 2 columns / 2-line style)
                  if (isSmall || is2Line) {
                    return (
                      <div key={idx} className="flex flex-col min-w-0">
                        <span
                          className={`text-[10px] font-normal select-none leading-none mb-0.5 tracking-wider uppercase block ${
                            field.isInactive
                              ? 'text-red-500 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          {field.label}
                        </span>
                        <div className="min-w-0">
                          {isNode ? (
                            field.value
                          ) : removeIconNode ? (
                            removeIconNode
                          ) : (
                            <span
                              className={`font-bold text-[12px] leading-snug whitespace-normal break-words min-w-0 block ${
                                field.isInactive || field.isRed ? 'text-red-600' : 'text-slate-900'
                              }`}
                              title={
                                field.title ||
                                (typeof field.value === 'string' ? field.value : undefined)
                              }
                            >
                              {field.value}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // 1-Line layout: [L-NAME:] [Value] (Tỉ lệ label : value = 1 : 3, khoảng cách dòng đều nhau, min 76px cho label)
                  return (
                    <div
                      key={idx}
                      className="grid min-h-6 grid-cols-[76px_minmax(0,1fr)] items-center gap-2.5 min-w-0"
                    >
                      <span
                        className={`text-[10px] font-normal select-none leading-none truncate uppercase ${
                          field.isInactive
                            ? 'text-red-500 font-medium'
                            : 'text-slate-400'
                        }`}
                      >
                        {field.label}
                      </span>
                      <div className="flex min-h-6 min-w-0 items-center">
                        {isNode ? (
                          field.value
                        ) : removeIconNode ? (
                          removeIconNode
                        ) : (
                          <span
                            className={`font-bold text-[12px] leading-snug whitespace-normal break-words min-w-0 block ${
                              field.isInactive || field.isRed ? 'text-red-600' : 'text-slate-800'
                            }`}
                            title={
                              field.title ||
                              (typeof field.value === 'string' ? field.value : undefined)
                            }
                          >
                            {field.value}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {entityTypeStr === 'club' && (() => {
          const comp = data.comp;
          const compName = comp?.name_sh || comp?.name_lg || comp?.name;
          const nation3Letter = data.nation?.name_3l;
          const nationFlagUrl =
            getLocalFlagUrl(nation3Letter);
          const compTagText = compName || null;
          if (!compTagText && !data.is_extinct) return null;

          return (
            <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5 border-t border-blue-200/60 pt-2">
              {data.is_extinct ? (
                <Tag color="error" className="m-0 max-w-full truncate !border !border-red-300 text-[10px] font-bold">
                  EXTINCT
                </Tag>
              ) : compTagText ? (
                <Tooltip title={compTagText}>
                  <Tag
                    color="blue"
                    className="m-0 !inline-flex max-w-full !items-center gap-2 truncate px-2 py-1 !text-[12px] font-semibold leading-none"
                  >
                    {nationFlagUrl ? (
                      <img
                        src={nationFlagUrl}
                        alt={nation3Letter || 'Nation flag'}
                        className="h-4 w-6 shrink-0 rounded-[3px] border border-black/10 object-cover shadow-2xs"
                        onError={(event) => {
                          if (!event.currentTarget.dataset.fallbackAttempted) {
                            event.currentTarget.dataset.fallbackAttempted = 'true';
                            event.currentTarget.src = getLocalFlagUrl(nation3Letter, true);
                          } else {
                            event.currentTarget.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <FlagOutlined className="shrink-0 text-[14px]" />
                    )}
                    <span className="truncate">{compTagText}</span>
                  </Tag>
                </Tooltip>
              ) : null}

            </div>
          );
        })()}

        {isComp && Number(data.childrenCount || data.children_count || 0) > 0 && onViewChildren && (
          <div className="mt-2 flex justify-end border-t border-blue-200/60 pt-2">
            <Tooltip title="Sub-competitions">
              <button
                type="button"
                aria-label={`View ${Number(data.childrenCount || data.children_count)} sub-competitions`}
                onClick={(event) => {
                  event.stopPropagation();
                  onViewChildren(data);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700 transition-colors hover:border-amber-500 hover:bg-amber-100"
              >
                <BranchesOutlined className="text-[12px]" />
                <span className="rounded-full border border-amber-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none">
                  {Number(data.childrenCount || data.children_count)}
                </span>
              </button>
            </Tooltip>
          </div>
        )}

      </div>

      {/* Unified Record Detail + Edit Modal */}
      <RecordDetailModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        data={data}
        type={type}
        initialMode={modalMode}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </>
  );
}
