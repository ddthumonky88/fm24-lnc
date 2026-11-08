'use client';

import React, { useEffect, useState } from 'react';
import { Tag, Button, Checkbox, Input, Tooltip, message } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  UserOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { EntityType, RecordType } from '../types';
import {
  NationIcon,
  IntCompIcon,
  DomesticCompIcon,
  ClubIcon,
  StadiumIcon,
  CityIcon,
  AwardIcon,
} from './EntityIcons';
import { getNationLogoUrl, updateRecord } from '../services/api';

const parseColor = (rgbStr?: string | null) => {
  if (!rgbStr || typeof rgbStr !== 'string') return null;
  const parts = rgbStr.trim().split(/\s+/).map(Number);
  if (parts.length >= 3 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    const [r, g, b] = parts;
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    const contrast = yiq >= 128 ? '#1e293b' : '#ffffff';
    return {
      css: `rgb(${r}, ${g}, ${b})`,
      hex,
      rgb: `rgb(${r}, ${g}, ${b})`,
      contrast,
    };
  }
  return null;
};

const CONFED_LOOKUP: Record<string, { id: string; name: string }> = {
  '1': { id: 'CAF', name: 'CAF' },
  CAF: { id: 'CAF', name: 'CAF' },
  AFRICA: { id: 'CAF', name: 'CAF' },

  '2': { id: 'AFC', name: 'AFC' },
  AFC: { id: 'AFC', name: 'AFC' },
  ASIA: { id: 'AFC', name: 'AFC' },

  '3': { id: 'UEFA', name: 'UEFA' },
  UEFA: { id: 'UEFA', name: 'UEFA' },
  EUROPE: { id: 'UEFA', name: 'UEFA' },

  '4': { id: 'CONCACAF', name: 'CONCACAF' },
  CONCACAF: { id: 'CONCACAF', name: 'CONCACAF' },
  'NORTH AMERICA': { id: 'CONCACAF', name: 'CONCACAF' },

  '5': { id: 'OFC', name: 'OFC' },
  OFC: { id: 'OFC', name: 'OFC' },
  OCEANIA: { id: 'OFC', name: 'OFC' },

  '6': { id: 'CONMEBOL', name: 'CONMEBOL' },
  CONMEBOL: { id: 'CONMEBOL', name: 'CONMEBOL' },
  'SOUTH AMERICA': { id: 'CONMEBOL', name: 'CONMEBOL' },

  '7': { id: 'WORLD', name: 'World' },
  WORLD: { id: 'WORLD', name: 'World' },
  INTERNATIONAL: { id: 'WORLD', name: 'World' },
  FIFA: { id: 'WORLD', name: 'World' },
  GLOBAL: { id: 'WORLD', name: 'World' },

  '8': { id: 'EXTINCT', name: 'Extinct' },
  EXTINCT: { id: 'EXTINCT', name: 'Extinct' },
};

export interface RecordDetailViewProps {
  data: any;
  type: EntityType | RecordType | string;
  showHeader?: boolean;
  hideClubAffiliates?: boolean;
  section?: 'all' | 'identity' | 'attributes';
  counts?: {
    domesticComps?: number;
    stadiums?: number;
    cities?: number;
    awards?: number;
    independentClubs?: number;
    extinctClubs?: number;
    parentComps?: number;
    clubs?: number;
    allClubs?: number;
    totalAwards?: number;
    regions?: number;
    totalNations?: number;
    totalIntComps?: number;
  };
  onEdit?: () => void;
  inlineEdit?: boolean;
  onSaved?: () => void | Promise<void>;
  onNavigateConfed?: (confedId: string) => void;
  onNavigateNation?: (nationId: string) => void;
  onNavigateParentComp?: (compId: string) => void;
  onNavigateComp?: (compId: string) => void;
  onNavigateClub?: (clubId: string) => void;
  onSwitchTab?: (tabKey: string) => void;
  onNavigateFakeComp?: (fakeCompId: string) => void;
}

export default function RecordDetailView({
  data,
  type,
  showHeader = false,
  hideClubAffiliates = false,
  section = 'all',
  counts,
  onEdit,
  inlineEdit = false,
  onSaved,
  onNavigateConfed,
  onNavigateNation,
  onNavigateParentComp,
  onNavigateComp,
  onNavigateClub,
  onSwitchTab,
  onNavigateFakeComp,
}: RecordDetailViewProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState({
    name_lg: '',
    name_sh: '',
    name_6l: '',
    name_3l: '',
  });
  const [inactiveDraft, setInactiveDraft] = useState<string[]>([]);

  useEffect(() => {
    setNameDraft({
      name_lg: data?.name_lg || data?.name || '',
      name_sh: data?.name_sh || '',
      name_6l: data?.name_6l || '',
      name_3l: data?.name_3l || data?.code || '',
    });
    setInactiveDraft(
      String(data?.inactive_fields || '')
        .split(',')
        .map((field) => field.trim().toLowerCase())
        .filter(Boolean),
    );
    setIsEditing(false);
  }, [data?.id, data?.name_lg, data?.name_sh, data?.name_6l, data?.name_3l, data?.inactive_fields]);

  if (!data) return null;

  const currentData = data;

  const isPlayer = type === EntityType.PLAYER;
  const isCity = type === EntityType.CITY;
  const isStadium = type === EntityType.STADIUM;
  const isComp =
    type === EntityType.COMPETITION || (type as string) === 'international_competition';
  const isClub = type === EntityType.CLUB;
  const isNation = type === EntityType.NATION;
  const isConfed = type === EntityType.CONFEDERATION;
  const isAward = type === EntityType.AWARD;

  const isVirtual = Boolean(
    currentData.is_virtual ||
      currentData.id === '[EXTINCT]' ||
      currentData.id === '[OTHER]' ||
      String(currentData.id).startsWith('oth-') ||
      String(currentData.id).startsWith('ext-') ||
      currentData.id === 'extinct' ||
      currentData.id === 'other',
  );

  const isVirtualExtinct =
    isVirtual &&
    (currentData.virtual_type === 'EXTINCT' ||
      currentData.id === '[EXTINCT]' ||
      String(currentData.id).startsWith('ext-') ||
      currentData.id === 'extinct');

  const isInternationalComp =
    isComp &&
    Boolean(
      currentData.is_international ||
        type === 'international_competition' ||
        (!currentData.nation_id &&
          !currentData.nation &&
          (currentData.confed_id || currentData.confed || currentData.categories || currentData.type)),
    );

  const rawConfedVal =
    (typeof currentData.confed === 'string'
      ? currentData.confed
      : currentData.confed?.id || currentData.confed?.name) ||
    currentData.confed_id ||
    currentData.confed_name ||
    (typeof currentData.nation?.confed === 'string'
      ? currentData.nation.confed
      : currentData.nation?.confed?.id || currentData.nation?.confed?.name) ||
    currentData.nation?.confed_id ||
    (typeof currentData.comp?.confed === 'string'
      ? currentData.comp.confed
      : currentData.comp?.confed?.id || currentData.comp?.confed?.name) ||
    null;

  const confedLookupKey = rawConfedVal ? String(rawConfedVal).trim().toUpperCase() : null;
  const resolvedConfed = confedLookupKey ? CONFED_LOOKUP[confedLookupKey] : null;

  const confedId = resolvedConfed?.id || (rawConfedVal ? String(rawConfedVal) : null);
  const confedName =
    resolvedConfed?.name ||
    (rawConfedVal ? String(rawConfedVal) : isInternationalComp ? 'World' : null);

  const nationId = isNation
    ? currentData.id
    : currentData.nation?.id || currentData.nation_id || currentData.country_id;
  const nationName = isNation
    ? currentData.name_lg || currentData.name || currentData.name_sh
    : currentData.nation?.name_lg || currentData.nation?.name || currentData.nation?.name_sh;
  const nationCode = isNation
    ? currentData.name_3l || currentData.code
    : currentData.nation?.name_3l;

  const inactiveList = (currentData.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isFieldInactive = (field: string | string[]) => {
    const fields = Array.isArray(field) ? field : [field];
    return fields.some((f) => {
      const lower = f.toLowerCase();
      return (
        inactiveList.includes(lower) ||
        inactiveList.some((item: string) => item.toLowerCase() === lower)
      );
    });
  };

  const getLabelClass = (field?: string | string[], extraClass: string = '') => {
    const inactive = field ? isFieldInactive(field) : false;
    return `${
      inactive ? 'text-red-500 font-medium' : 'text-slate-400 font-normal'
    } text-[10px] shrink-0 select-none whitespace-nowrap leading-tight uppercase ${extraClass}`;
  };

  const getValueClass = (field?: string | string[], defaultClass: string = 'text-slate-800') => {
    const inactive = field ? isFieldInactive(field) : false;
    return inactive ? 'text-red-600' : defaultClass;
  };

  const getTypeLabel = () => {
    if (isInternationalComp) return 'International Competition';
    if (isVirtual) return 'Virtual Group';
    if (isClub) return 'Club';
    if (isComp) return 'Domestic Competition';
    if (isNation) return 'Nation';
    if (isConfed) return 'Confederation';
    if (isStadium) return 'Stadium';
    if (isCity) return 'City';
    if (isAward) return 'Award';
    if (isPlayer) return 'Person';
    return String(type).toUpperCase();
  };

  const getTypeBadgeStyles = () => {
    if (isInternationalComp) return 'bg-purple-50 border-purple-200 text-purple-700';
    if (isComp) return 'bg-amber-50 border-amber-200 text-amber-700';
    if (isClub) return 'bg-blue-50 border-blue-200 text-blue-700';
    if (isNation) return 'bg-cyan-50 border-cyan-200 text-cyan-700';
    if (isConfed) return 'bg-indigo-50 border-indigo-200 text-indigo-700';
    if (isPlayer) return 'bg-purple-50 border-purple-200 text-purple-700';
    if (isStadium) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (isCity) return 'bg-sky-50 border-sky-200 text-sky-700';
    if (isAward) return 'bg-yellow-50 border-yellow-300 text-yellow-700';
    if (isVirtual) return 'bg-orange-50 border-orange-200 text-orange-700';
    return 'bg-slate-50 border-slate-200 text-slate-700';
  };

  const getTypeIcon = (size = 18) => {
    if (isInternationalComp)
      return <IntCompIcon size={size} className="text-purple-600 shrink-0" />;
    if (isVirtual) return <ClubIcon size={size} className="text-orange-500 shrink-0" />;
    if (isComp) return <DomesticCompIcon size={size} className="text-amber-500 shrink-0" />;
    if (isClub) return <ClubIcon size={size} className="text-blue-500 shrink-0" />;
    if (isNation) return <NationIcon size={size} className="text-cyan-600 shrink-0" />;
    if (isConfed) return <IntCompIcon size={size} className="text-indigo-500 shrink-0" />;
    if (isStadium) return <StadiumIcon size={size} className="text-emerald-500 shrink-0" />;
    if (isCity) return <CityIcon size={size} className="text-sky-500 shrink-0" />;
    if (isAward) return <AwardIcon size={size} className="text-yellow-500 shrink-0" />;
    if (isPlayer)
      return <UserOutlined style={{ fontSize: size }} className="text-purple-500 shrink-0" />;
    return <AppstoreOutlined style={{ fontSize: size }} className="text-gray-500 shrink-0" />;
  };

  const title = isPlayer
    ? `${currentData.first_name || ''} ${currentData.second_name || ''}`.trim() ||
      currentData.common_name ||
      'Unnamed Player'
    : isVirtual
      ? isVirtualExtinct
        ? 'Extinct Clubs'
        : 'Other Clubs'
      : currentData.name_sh || currentData.name_lg || currentData.name || 'Unnamed';

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (currentData.id !== undefined && currentData.id !== null) {
      navigator.clipboard.writeText(String(currentData.id));
      setCopied(true);
      message.success(`Copied ${currentData.id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const bgInfo = parseColor(currentData.bg_color);
  const fgInfo = parseColor(currentData.fg_color);

  const handleInlineSave = async () => {
    if (!currentData.id) return;
    setIsSaving(true);
    try {
      await updateRecord(RecordType.CLUB, String(currentData.id), {
        name_lg: nameDraft.name_lg.trim() || null,
        name_sh: nameDraft.name_sh.trim() || null,
        name_6l: nameDraft.name_6l.trim() || null,
        name_3l: nameDraft.name_3l.trim() || null,
        inactive_fields: inactiveDraft.length ? [...inactiveDraft].sort().join(',') : null,
      });
      message.success('Club updated successfully');
      setIsEditing(false);
      await onSaved?.();
    } catch (error: any) {
      message.error(error?.message || 'Failed to update club');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInactiveDraft = (field: string, checked: boolean) => {
    setInactiveDraft((previous) => {
      const next = new Set(previous);
      if (checked) next.add(field);
      else next.delete(field);
      return Array.from(next);
    });
  };

  const resetInlineDraft = () => {
    setNameDraft({
      name_lg: currentData.name_lg || currentData.name || '',
      name_sh: currentData.name_sh || '',
      name_6l: currentData.name_6l || '',
      name_3l: currentData.name_3l || currentData.code || '',
    });
    setInactiveDraft(
      String(currentData.inactive_fields || '')
        .split(',')
        .map((field: string) => field.trim().toLowerCase())
        .filter(Boolean),
    );
  };

  const renderInlineName = (field: keyof typeof nameDraft, fallback = '-') =>
    isEditing ? (
      <div className="flex items-center gap-2 min-w-0">
        {field === 'name_lg' ? (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={nameDraft[field]}
            onChange={(event) =>
              setNameDraft((previous) => ({ ...previous, [field]: event.target.value }))
            }
            className="!resize-none !text-[12px] font-semibold flex-1 min-w-0"
          />
        ) : field === 'name_sh' ? (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={nameDraft[field]}
            onChange={(event) =>
              setNameDraft((previous) => ({ ...previous, [field]: event.target.value }))
            }
            className="!resize-none !text-[12px] font-semibold flex-1 min-w-0"
          />
        ) : (
          <Input
            size="large"
            value={nameDraft[field]}
            maxLength={field === 'name_3l' ? 3 : undefined}
            onChange={(event) =>
              setNameDraft((previous) => ({ ...previous, [field]: event.target.value }))
            }
            onPressEnter={handleInlineSave}
            className="!text-[12px] font-semibold flex-1 min-w-0"
          />
        )}
        <Tooltip title="Inactive field">
          <Checkbox
            aria-label={`Mark ${field} as inactive`}
            checked={inactiveDraft.includes(field)}
            onChange={(event) => toggleInactiveDraft(field, event.target.checked)}
            className="shrink-0"
          />
        </Tooltip>
      </div>
    ) : (
      nameDraft[field] || fallback
    );

  // 1. Header Card (Optional)
  const renderHeader = () => (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <Tooltip title={getTypeLabel()} placement="bottom">
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-default p-0 shadow-2xs border ${getTypeBadgeStyles()}`}
          >
            {getTypeIcon(18)}
          </div>
        </Tooltip>

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            {currentData.id !== undefined && currentData.id !== null && (
              <Tooltip title="Click to copy ID" placement="bottom">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                >
                  <span>{currentData.id}</span>
                  {copied ? (
                    <CheckOutlined className="text-emerald-600 text-xs" />
                  ) : (
                    <CopyOutlined className="text-sky-500 text-xs" />
                  )}
                </button>
              </Tooltip>
            )}
          </div>

          <div className="mt-1 min-w-0">
            <div
              className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug"
              title={title}
            >
              <span>{title}</span>
            </div>
          </div>
        </div>
      </div>

      {onEdit && (
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={onEdit}
          className="font-medium px-3.5 h-8 sm:h-9 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 shrink-0"
        >
          <span>Edit</span>
        </Button>
      )}
    </div>
  );

  // 2. Section 1: THÔNG TIN ĐỊNH DANH (Names & Hierarchy)
  const renderIdentity = () => (
    <div className={`bg-white rounded-2xl p-3.5 shadow-2xs space-y-1.5 ${isClub ? 'border border-sky-200/90' : 'border border-slate-200/90'}`}>
      <div className={`flex items-center justify-between ${isClub ? 'rounded-xl bg-sky-700 px-3 py-2.5 mb-2.5' : 'border-b border-slate-100 pb-2 mb-1'}`}>
        <span className={isClub
          ? 'text-[11px] font-bold text-white uppercase tracking-wider'
          : 'text-[10px] font-normal text-slate-400 uppercase tracking-wider'}>
          {isClub ? 'TEAM INFORMATION' : 'IDENTITY'}
        </span>
        {inlineEdit && isClub && !isVirtual ? (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Tooltip title="Cancel">
                  <Button
                    type="text"
                    size="small"
                    aria-label="Cancel editing"
                    icon={<CloseOutlined />}
                    disabled={isSaving}
                    onClick={() => {
                      resetInlineDraft();
                      setIsEditing(false);
                    }}
                    className="!h-8 !w-8 !min-w-8 !p-0 !text-white hover:!bg-white/15"
                  />
                </Tooltip>
                <Tooltip title="Save changes">
                  <Button
                    type="primary"
                    size="small"
                    aria-label="Save changes"
                    icon={<SaveOutlined />}
                    loading={isSaving}
                    onClick={handleInlineSave}
                    className="!h-8 !w-8 !min-w-8 !p-0 !bg-white !text-sky-700 hover:!bg-sky-50"
                  />
                </Tooltip>
              </>
            ) : (
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  resetInlineDraft();
                  setIsEditing(true);
                }}
                className={isClub
                  ? '!h-7 !px-2.5 text-[11px] font-semibold !text-white hover:!bg-white/15'
                  : '!h-6 !px-2 text-[11px] font-medium text-blue-600 hover:!bg-blue-50 hover:!text-blue-700'}
              >
                Edit
              </Button>
            )}
          </div>
        ) : onEdit && !isVirtual ? (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={onEdit}
            className="!h-6 !px-2 text-[11px] font-medium text-blue-600 hover:!bg-blue-50 hover:!text-blue-700"
          >
            Edit
          </Button>
        ) : null}
      </div>

      {isCity || isStadium ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass('name', 'pt-0.5')}>NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass('name', 'text-slate-900')} line-clamp-3 break-words text-left`}
              title={currentData.name || title || '-'}
            >
              {currentData.name || title || '-'}
            </span>
          </div>

          {/* Associated Nation for City/Stadium */}
          {nationId && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
              <span className={getLabelClass(['nation_id', 'country_id', 'nation'], 'pt-0.5')}>
                NATION:
              </span>
              <div
                onClick={() => {
                  if (nationId && onNavigateNation) onNavigateNation(String(nationId));
                }}
                className={`flex items-center gap-1.5 min-w-0 text-left ${
                  nationId && onNavigateNation ? 'cursor-pointer group' : ''
                }`}
              >
                {getNationLogoUrl(nationId, nationCode) ? (
                  <img
                    src={getNationLogoUrl(nationId, nationCode)}
                    alt={nationName || 'Nation'}
                    className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <span
                  className={`font-bold text-[12px] ${
                    nationId && onNavigateNation
                      ? 'text-blue-600 group-hover:underline'
                      : getValueClass(['nation_id', 'country_id', 'nation'])
                  } truncate`}
                >
                  {nationName || nationId}
                </span>
              </div>
            </div>
          )}

          {/* City for Stadium */}
          {isStadium && (currentData.city?.name || currentData.city_name || currentData.city_id) && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
              <span className={getLabelClass('city', 'pt-0.5')}>CITY:</span>
              <span className="font-bold text-[12px] text-slate-800 break-words text-left">
                {currentData.city?.name || currentData.city_name || currentData.city_id}
              </span>
            </div>
          )}

          {/* Region for City */}
          {isCity && currentData.region && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
              <span className={getLabelClass('region', 'pt-0.5')}>REGION:</span>
              <span
                className={`font-bold text-[12px] ${getValueClass('region', 'text-sky-800')} break-words text-left`}
              >
                {String(currentData.region?.name || currentData.region_name || currentData.region).replace(/^\[[^\]]+\]\s*/, '').trim()}
              </span>
            </div>
          )}
        </>
      ) : isConfed ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass('name', 'pt-0.5')}>NAME:</span>
            <span
              className="font-bold text-[12px] text-slate-900 line-clamp-3 break-words text-left"
              title={currentData.name || '-'}
            >
              {currentData.name || '-'}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
            <span className={getLabelClass('id', 'pt-0.5')}>ID:</span>
            <span className="font-mono font-bold text-[12px] text-slate-800 break-words text-left">
              {currentData.id || '-'}
            </span>
          </div>
        </>
      ) : isAward ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['name_lg', 'name'], 'pt-0.5')}>L-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
              title={currentData.name_lg || currentData.name || title}
            >
              {currentData.name_lg || currentData.name || title}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['name_sh'], 'pt-0.5')}>S-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
              title={currentData.name_sh || currentData.name || '-'}
            >
              {currentData.name_sh || currentData.name || '-'}
            </span>
          </div>

          {confedName && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
              <span className={getLabelClass(['confed_id', 'confed'], 'pt-0.5')}>CONFED:</span>
              <span className="font-bold text-[12px] text-slate-800 break-words text-left">
                {confedName}
              </span>
            </div>
          )}

          {nationId && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
              <span className={getLabelClass(['nation_id', 'nation'], 'pt-0.5')}>NATION:</span>
              <span className="font-bold text-[12px] text-slate-800 break-words text-left">
                {nationName || nationId}
              </span>
            </div>
          )}
        </>
      ) : isClub ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg bg-slate-50/90 px-3 py-2.5">
            <span className={getLabelClass(['name_lg', 'name'], 'text-right')}>L-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
              title={isVirtual ? '-' : currentData.name_lg || currentData.name || title}
            >
              {isVirtual ? '-' : renderInlineName('name_lg', title)}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg px-3 py-2.5">
            <span className={getLabelClass(['name_sh'], 'text-right')}>S-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
              title={isVirtual ? '-' : currentData.name_sh || currentData.name || '-'}
            >
              {isVirtual ? '-' : renderInlineName('name_sh')}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg bg-slate-50/90 px-3 py-2.5">
            <span className={getLabelClass(['name_6l'], 'text-right')}>6L-NAME:</span>
            <span
              className={`font-sans font-bold text-[12px] ${getValueClass(['name_6l'])} break-words text-left`}
            >
              {renderInlineName('name_6l')}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg px-3 py-2.5">
            <span className={getLabelClass(['name_3l', 'code'], 'text-right')}>3L-NAME:</span>
            <span
              className={`font-sans font-bold text-[12px] ${getValueClass(['name_3l', 'code'])} break-words text-left`}
            >
              {isVirtual ? '-' : renderInlineName('name_3l')}
            </span>
          </div>

          {confedName && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg bg-slate-50/90 px-3 py-2.5">
              <span className={getLabelClass(['confed_id', 'confed'], 'text-right')}>CONFED:</span>
              <span
                onClick={() => {
                  if (confedId && onNavigateConfed) onNavigateConfed(String(confedId));
                }}
                className={`font-bold text-[12px] ${
                  confedId && onNavigateConfed
                    ? 'text-blue-600 hover:underline cursor-pointer'
                    : getValueClass(['confed_id', 'confed'])
                } break-words text-left`}
              >
                {confedName}
              </span>
            </div>
          )}

          {nationId && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg bg-slate-50/90 px-3 py-2.5">
              <span className={getLabelClass(['nation_id', 'country_id', 'nation'], 'text-right')}>
                NATION:
              </span>
              <div
                onClick={() => {
                  if (nationId && onNavigateNation) onNavigateNation(String(nationId));
                }}
                className={`flex items-center gap-1.5 min-w-0 text-left ${
                  nationId && onNavigateNation ? 'cursor-pointer group' : ''
                }`}
              >
                {getNationLogoUrl(nationId, nationCode) ? (
                  <img
                    src={getNationLogoUrl(nationId, nationCode)}
                    alt={nationName || 'Nation'}
                    className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <span
                  className={`font-bold text-[12px] ${
                    nationId && onNavigateNation
                      ? 'text-blue-600 group-hover:underline'
                      : getValueClass(['nation_id', 'country_id', 'nation'])
                  } truncate`}
                >
                  {nationName}
                </span>
              </div>
            </div>
          )}

          {(currentData.comp || currentData.comp_id) && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-center gap-3 min-w-0 rounded-lg px-3 py-2.5">
              <span className={getLabelClass(['comp_id', 'competition_id', 'comp'], 'text-right')}>
                LEAGUE:
              </span>
              <div
                onClick={() => {
                  const cId = currentData.comp?.id || currentData.comp_id;
                  if (cId && onNavigateComp) onNavigateComp(String(cId));
                }}
                className={`flex items-center gap-1.5 min-w-0 text-left ${
                  (currentData.comp?.id || currentData.comp_id) && onNavigateComp
                    ? 'cursor-pointer group'
                    : ''
                }`}
              >
                <span
                  className={`font-bold text-[12px] ${
                    (currentData.comp?.id || currentData.comp_id) && onNavigateComp
                      ? 'text-blue-600 group-hover:underline'
                      : getValueClass(['comp_id', 'comp'])
                  } truncate`}
                >
                  {currentData.comp?.name_sh ||
                    currentData.comp?.name_lg ||
                    currentData.comp?.name ||
                    (currentData.comp_id ? `Competition ${currentData.comp_id}` : '-')}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Nation or Competition (default) */
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['name_lg', 'name'], 'pt-0.5')}>L-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
              title={isVirtual ? '-' : currentData.name_lg || currentData.name || title}
            >
              {isVirtual ? '-' : currentData.name_lg || currentData.name || title}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['name_sh'], 'pt-0.5')}>S-NAME:</span>
            <span
              className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
              title={isVirtual ? '-' : currentData.name_sh || currentData.name || '-'}
            >
              {isVirtual ? '-' : currentData.name_sh || currentData.name || '-'}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['name_3l', 'code'], 'pt-0.5')}>3L-NAME:</span>
            <span
              className={`font-sans font-bold text-[12px] ${getValueClass(['name_3l', 'code'])} break-words text-left`}
            >
              {isVirtual ? '-' : currentData.name_3l || nationCode || '-'}
            </span>
          </div>

          {/* Confederation */}
          {(isInternationalComp || isNation || (!isClub && !isConfed && (confedId || confedName))) && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
              <span className={getLabelClass(['confed_id', 'confed'], 'pt-0.5')}>CONFED:</span>
              <span
                onClick={() => {
                  if (confedId && onNavigateConfed) onNavigateConfed(String(confedId));
                }}
                className={`font-bold text-[12px] ${
                  confedId && onNavigateConfed
                    ? 'text-blue-600 hover:underline cursor-pointer'
                    : getValueClass(['confed_id', 'confed'])
                } break-words text-left`}
              >
                {confedName || '-'}
              </span>
            </div>
          )}

          {/* Nation (for Competition) */}
          {!isNation && !isInternationalComp && !isConfed && nationId && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
              <span className={getLabelClass(['nation_id', 'country_id', 'nation'], 'pt-0.5')}>
                NATION:
              </span>
              <div
                onClick={() => {
                  if (nationId && onNavigateNation) onNavigateNation(String(nationId));
                }}
                className={`flex items-center gap-1.5 min-w-0 text-left ${
                  nationId && onNavigateNation ? 'cursor-pointer group' : ''
                }`}
              >
                {getNationLogoUrl(nationId, nationCode) ? (
                  <img
                    src={getNationLogoUrl(nationId, nationCode)}
                    alt={nationName || 'Nation'}
                    className="w-4 h-3 object-cover rounded-2xs border border-slate-200 shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : null}
                <span
                  className={`font-bold text-[12px] ${
                    nationId && onNavigateNation
                      ? 'text-blue-600 group-hover:underline'
                      : getValueClass(['nation_id', 'country_id', 'nation'])
                  } truncate`}
                >
                  {nationName}
                </span>
              </div>
            </div>
          )}

          {/* Parent Competition (for Competitions) */}
          {isComp &&
            (currentData.parent_comp ||
              currentData.parent ||
              currentData.parent_id ||
              isFieldInactive(['parent_comp', 'parent_id', 'parent'])) && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
                <span className={getLabelClass(['parent_comp', 'parent_id', 'parent'], 'pt-0.5')}>
                  PARENT COMP:
                </span>
                <span
                  onClick={() => {
                    const pId =
                      currentData.parent_comp?.id ||
                      currentData.parent?.id ||
                      currentData.parent_id;
                    if (pId && onNavigateParentComp) onNavigateParentComp(String(pId));
                  }}
                  className={`font-bold text-[12px] ${
                    (currentData.parent_comp?.id ||
                      currentData.parent?.id ||
                      currentData.parent_id) &&
                    onNavigateParentComp
                      ? 'text-blue-600 hover:underline cursor-pointer'
                      : getValueClass(['parent_comp', 'parent_id', 'parent'])
                  } line-clamp-3 break-words text-left`}
                >
                  {(() => {
                    const p = currentData.parent_comp || currentData.parent;
                    if (p) {
                      const pName = p.name_lg || p.name_sh || p.name;
                      const p3l = p.name_3l ? `[${p.name_3l}] ` : '';
                      return `${p3l}${pName || p.id}`;
                    }
                    return currentData.parent_id ? `${currentData.parent_id}` : '-';
                  })()}
                </span>
              </div>
            )}
        </>
      )}
    </div>
  );

  // 3. Section 2: THUỘC TÍNH & MÀU SẮC (Attributes & Colors)
  const renderAttributes = () => (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
        <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
          {isCity || isStadium ? 'DETAILED ATTRIBUTES' : 'ATTRIBUTES & COLORS'}
        </span>
      </div>

      {/* Type Row */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
        <span className={getLabelClass('type', 'pt-0.5')}>TYPE:</span>
        <div className="flex items-center gap-1.5 flex-wrap text-left">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${getTypeBadgeStyles()}`}
          >
            {getTypeLabel()}
          </span>
        </div>
      </div>

      {/* BG Color Row */}
      {bgInfo && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
          <span
            className={getLabelClass(['bg_color', 'background_color'], 'pt-0.5')}
            title="Background Color"
          >
            BG:
          </span>
          <div className="flex items-center gap-2 min-w-0 text-left">
            <Tooltip title={`Hex: ${bgInfo.hex}`}>
              <span
                className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs shrink-0 cursor-pointer"
                style={{ backgroundColor: bgInfo.css }}
              />
            </Tooltip>
            <span
              className={`font-mono font-bold text-[12px] ${getValueClass(['bg_color', 'background_color'])}`}
            >
              {currentData.bg_color}
            </span>
          </div>
        </div>
      )}

      {/* FG Color Row */}
      {fgInfo && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
          <span
            className={getLabelClass(['fg_color', 'foreground_color'], 'pt-0.5')}
            title="Foreground Color"
          >
            FG:
          </span>
          <div className="flex items-center gap-2 min-w-0 text-left">
            <Tooltip title={`Hex: ${fgInfo.hex}`}>
              <span
                className="inline-block w-4 h-4 rounded border border-black/20 shadow-2xs shrink-0 cursor-pointer"
                style={{ backgroundColor: fgInfo.css }}
              />
            </Tooltip>
            <span
              className={`font-mono font-bold text-[12px] ${getValueClass(['fg_color', 'foreground_color'])}`}
            >
              {currentData.fg_color}
            </span>
          </div>
        </div>
      )}

      {/* Stadium Capacity */}
      {isStadium && (currentData.capacity || currentData.seating_capacity) && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
          <span className={getLabelClass('capacity', 'pt-0.5')}>CAPACITY:</span>
          <span className="font-bold text-[12px] text-slate-800 font-mono text-left">
            {Number(currentData.capacity || currentData.seating_capacity).toLocaleString()} seats
          </span>
        </div>
      )}

      {/* Club Affiliate Info */}
      {!hideClubAffiliates && isClub && (currentData.affiliate?.id || currentData.affiliate?.name_lg || currentData.affiliate?.name_sh || currentData.affiliate?.type) && (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
            <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
              AFFILIATE CLUB:
            </span>
            <div
              onClick={() => {
                if (currentData.affiliate?.id && onNavigateClub) {
                  onNavigateClub(String(currentData.affiliate.id));
                }
              }}
              className={`flex items-center gap-1.5 flex-wrap ${
                currentData.affiliate?.id && onNavigateClub ? 'cursor-pointer group' : ''
              }`}
            >
              <span
                className={`font-bold text-[12px] ${
                  currentData.affiliate?.id && onNavigateClub
                    ? 'text-blue-600 group-hover:underline'
                    : 'text-slate-800'
                }`}
              >
                {currentData.affiliate?.name_lg ||
                  currentData.affiliate?.name_sh ||
                  currentData.affiliate?.name ||
                  `Club #${currentData.affiliate?.id}`}
              </span>
            </div>
          </div>
          {currentData.affiliate?.type && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100">
              <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
                AFFILIATE TYPE:
              </span>
              <div>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  {currentData.affiliate.type}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Status Row */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
        <span className={getLabelClass('status', 'pt-0.5')}>STATUS:</span>
        <div className="flex items-center gap-1.5 flex-wrap text-left">
          {currentData.is_disabled ? (
            <Tag color="red" className="m-0 text-[11px] font-medium py-0.5 px-2">
              Disabled in .lnc
            </Tag>
          ) : currentData.is_extinct ? (
            <Tag color="red" className="m-0 text-[11px] font-medium py-0.5 px-2">
              Extinct
            </Tag>
          ) : isVirtual ? (
            <Tag color="orange" className="m-0 text-[11px] font-medium py-0.5 px-2">
              {isVirtualExtinct ? 'Extinct Container' : 'Independent Container'}
            </Tag>
          ) : (
            <Tag color="green" className="m-0 text-[11px] font-medium py-0.5 px-2">
              Active
            </Tag>
          )}
        </div>
      </div>

      {/* Inactive Fields Warning */}
      {inactiveList.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-slate-100 last:border-b-0 last:pb-0">
          <span className="text-[10px] font-normal text-red-500 uppercase pt-0.5">INACTIVE:</span>
          <span className="text-[11px] font-medium text-red-600 break-words text-left">
            {inactiveList.join(', ')}
          </span>
        </div>
      )}

      {/* Notes Row if present */}
      {currentData.note && (
        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-start gap-2 text-xs text-slate-700">
          <InfoCircleOutlined className="text-sky-500 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-slate-700 block mb-0.5 text-[10px] uppercase">Notes:</span>
            <p className="italic text-slate-600 break-words m-0 text-[11px]">{currentData.note}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Optional Header Card */}
      {showHeader && renderHeader()}

      {/* Render requested section or all */}
      {section === 'identity' && renderIdentity()}
      {section === 'attributes' && renderAttributes()}
      {section === 'all' && (
        <>
          {renderIdentity()}
          {renderAttributes()}
        </>
      )}
    </div>
  );
}
