'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Tag, Button, Tooltip, Input, Checkbox, Select, App, Popconfirm } from 'antd';
import {
  CopyOutlined,
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  EnvironmentOutlined,
  UserOutlined,
  InfoCircleOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  CloseOutlined,
  LockOutlined,
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
import { getNationLogoUrl, createRecord, updateRecord, deleteRecord, fetchAllRegionsByNation, RegionItem } from '../services/api';
import { useApp } from '../context/AppContext';

export interface RecordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
  type: EntityType | RecordType | string;
  initialMode?: 'view' | 'edit' | 'create';
  onEdit?: (record?: any) => void;
  onDelete?: (record: any) => void;
  onSuccess?: () => void;
  defaultNationId?: string | number;
  defaultCompId?: string | number;
  defaultParentId?: string | number;
}

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

const CONFED_NAME_MAP: Record<string, { id: string; name: string }> = {
  CAF: { id: '1', name: 'Africa' },
  AFRICA: { id: '1', name: 'Africa' },
  AFC: { id: '2', name: 'Asia' },
  ASIA: { id: '2', name: 'Asia' },
  UEFA: { id: '3', name: 'Europe' },
  EUROPE: { id: '3', name: 'Europe' },
  CONCACAF: { id: '4', name: 'North America' },
  'NORTH AMERICA': { id: '4', name: 'North America' },
  OFC: { id: '5', name: 'Oceania' },
  OCEANIA: { id: '5', name: 'Oceania' },
  CONMEBOL: { id: '6', name: 'South America' },
  'SOUTH AMERICA': { id: '6', name: 'South America' },
  WORLD: { id: '7', name: 'World' },
  INTERNATIONAL: { id: '7', name: 'World' },
  FIFA: { id: '7', name: 'World' },
  GLOBAL: { id: '7', name: 'World' },
};

const CONFED_ID_MAP: Record<string, string> = {
  '1': 'CAF',
  '2': 'AFC',
  '3': 'UEFA',
  '4': 'CONCACAF',
  '5': 'OFC',
  '6': 'CONMEBOL',
  '7': 'World',
  '8': 'EXTINCT',
};

export default function RecordDetailModal({
  isOpen,
  onClose,
  data,
  type,
  initialMode = 'view',
  onEdit,
  onDelete,
  onSuccess,
  defaultNationId,
  defaultCompId,
  defaultParentId,
}: RecordDetailModalProps) {
  const { triggerRefresh } = useApp();

  // Determine Type Flags
  const isPlayer = type === EntityType.PLAYER;
  const isCity = type === EntityType.CITY;
  const isStadium = type === EntityType.STADIUM;
  const isComp = type === EntityType.COMPETITION;
  const isClub = type === EntityType.CLUB;
  const isNation = type === EntityType.NATION;
  const isConfed = type === EntityType.CONFEDERATION;
  const isAward = type === EntityType.AWARD;
  const isRegion = type === EntityType.REGION;
  const { message } = App.useApp();

  const isCreate = !data || initialMode === 'create';
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(
    isCreate ? 'create' : initialMode === 'edit' ? 'edit' : 'view',
  );
  const [copied, setCopied] = useState(false);
  const [currentData, setCurrentData] = useState<any>(data || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuickEditing, setIsQuickEditing] = useState(false);

  // Form State
  const [formData, setFormData] = useState<any>({
    id: '',
    name: '',
    name_lg: '',
    name_sh: '',
    name_6l: '',
    name_3l: '',
    first_name: '',
    second_name: '',
    common_name: '',
    fg_color: '',
    bg_color: '',
    type: '',
    categories: '',
    is_disabled: false,
    is_international: false,
    is_extinct: false,
    note: '',
    inactive_fields: null,
    nation_id: defaultNationId ? String(defaultNationId) : null,
    comp_id: defaultCompId ? String(defaultCompId) : null,
    parent_id: defaultParentId ? String(defaultParentId) : '',
    affiliate_type: '',
    affiliate_club_id: '',
    affiliate_club_type: '',
    region_id: null,
    code: '',
  });

  const [cityRegions, setCityRegions] = useState<RegionItem[]>([]);
  useEffect(() => {
    if (isOpen && isCity) {
      const effNatId = formData.nation_id || currentData.nation_id || currentData.nation?.id || defaultNationId;
      if (effNatId) {
        fetchAllRegionsByNation(String(effNatId))
          .then((regs) => setCityRegions(regs || []))
          .catch(() => setCityRegions([]));
      }
    }
  }, [isOpen, isCity, formData.nation_id, currentData.nation_id, currentData.nation?.id, defaultNationId]);

  // Dynamic Scroll Detection (khi có scroll và khi không có scroll)
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScroll, setHasScroll] = useState(false);
  const [isScrolledTop, setIsScrolledTop] = useState(true);
  const [isScrolledBottom, setIsScrolledBottom] = useState(true);

  const checkScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollHeight > el.clientHeight + 2;
    setHasScroll(canScroll);
    setIsScrolledTop(el.scrollTop <= 2);
    setIsScrolledBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkScrollState();
      const rAF = requestAnimationFrame(checkScrollState);
      const timer = setTimeout(checkScrollState, 120);
      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(timer);
      };
    }
  }, [isOpen, mode, currentData, formData, checkScrollState]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isOpen) return;

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => {
        checkScrollState();
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [isOpen, checkScrollState]);

  useEffect(() => {
    if (isOpen) {
      const activeData = data || {};
      setCurrentData(activeData);
      setMode(isCreate ? 'create' : initialMode === 'edit' ? 'edit' : 'view');
      setIsQuickEditing(false);
      setErrorMessage(null);

      setFormData({
        id: activeData.id !== undefined && activeData.id !== null ? String(activeData.id) : '',
        name_lg: activeData.name_lg || '',
        name_sh: activeData.name_sh || '',
        name_3l: activeData.name_3l || activeData.code || '',
        name_6l: activeData.name_6l || '',
        first_name: activeData.first_name || '',
        second_name: activeData.second_name || '',
        common_name: activeData.common_name || '',
        name: activeData.name || activeData.name_lg || '',
        fg_color: activeData.fg_color || '',
        bg_color: activeData.bg_color || '',
        type: activeData.type || activeData.categories || '',
        categories: activeData.type || activeData.categories || '',
        is_disabled: Boolean(
          activeData.is_disabled ||
          activeData.isDisabled ||
          (activeData.inactive_fields && activeData.inactive_fields.includes('name')),
        ),
        is_international: !!activeData.is_international,
        is_extinct: !!activeData.is_extinct,
        note: activeData.note || '',
        inactive_fields: activeData.inactive_fields || null,
        nation_id: activeData.nation_id || activeData.nation?.id
          ? String(activeData.nation_id || activeData.nation?.id)
          : defaultNationId
            ? String(defaultNationId)
            : null,
        comp_id: activeData.comp_id
          ? String(activeData.comp_id)
          : defaultCompId
            ? String(defaultCompId)
            : null,
        parent_id: activeData.parent_id
          ? String(activeData.parent_id)
          : defaultParentId
            ? String(defaultParentId)
            : '',
        affiliate_type: activeData.affiliate_type || '',
        affiliate_club_id: activeData.affiliate?.id
          ? String(activeData.affiliate.id)
          : activeData.affiliate_club_id
            ? String(activeData.affiliate_club_id)
            : activeData.parent_id
              ? String(activeData.parent_id)
              : '',
        affiliate_club_type:
          activeData.affiliate?.type ||
          activeData.affiliate_club_type ||
          activeData.affiliate_type ||
          '',
        region_id:
          activeData.region_id !== undefined && activeData.region_id !== null
            ? Number(activeData.region_id)
            : activeData.region?.id !== undefined && activeData.region?.id !== null
              ? Number(activeData.region.id)
              : null,
        code: activeData.code || '',
      });
    }
  }, [isOpen, data, initialMode, isCreate, defaultNationId, defaultCompId, defaultParentId]);

  if (!isOpen) return null;

  const bgInfo = parseColor(currentData.bg_color);
  const fgInfo = parseColor(currentData.fg_color);

  const previewBgInfo = parseColor(formData.bg_color);
  const previewFgInfo = parseColor(formData.fg_color);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (currentData.id !== undefined && currentData.id !== null) {
      navigator.clipboard.writeText(String(currentData.id));
      setCopied(true);
      message.success(`Copied ${currentData.id}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inactiveList = (currentData.inactive_fields || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const quickInactiveFields = String(formData.inactive_fields || '')
    .split(',')
    .map((field) => field.trim().toLowerCase())
    .filter(Boolean);

  const toggleQuickInactive = (field: string, checked: boolean) => {
    const next = new Set(quickInactiveFields);
    if (checked) next.add(field);
    else next.delete(field);
    setFormData({ ...formData, inactive_fields: Array.from(next).sort().join(',') || null });
  };

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

  const getFormLabelClass = (field?: string | string[], extraClass: string = '') => {
    const inactive = field ? isFieldInactive(field) : false;
    return `block text-xs mb-1 ${
      inactive ? 'text-red-600 font-normal' : 'font-semibold text-slate-700'
    } ${extraClass}`;
  };

// Type flags moved to top
  const isVirtual = Boolean(
    currentData.is_virtual ||
      currentData.id === '[EXTINCT]' ||
      currentData.id === '[OTHER]' ||
      String(currentData.id).startsWith('oth-') ||
      String(currentData.id).startsWith('ext-'),
  );

  // International Competition & Confederation resolving
  const isInternationalComp =
    isComp &&
    Boolean(
      currentData.is_international ||
      (!currentData.nation_id && !currentData.nation &&
        (currentData.confed_id || currentData.confed || currentData.categories || currentData.type)),
    );

  const rawConfedId =
    currentData.confed?.id ||
    currentData.confed_id;
  const rawCat = currentData.type || currentData.categories
    ? String(currentData.type || currentData.categories).split(',')[0].trim().toUpperCase()
    : '';
  const catConfed = rawCat ? CONFED_NAME_MAP[rawCat] : null;

  const confedId = rawConfedId ? String(rawConfedId) : catConfed?.id || null;
  const confedName =
    currentData.confed?.name ||
    (rawConfedId && CONFED_ID_MAP[String(rawConfedId)]) ||
    currentData.confed_name ||
    catConfed?.name ||
    rawCat ||
    'International';

  const canEdit = !isVirtual && !isConfed && !isNation;
  const canDelete = !isVirtual && !isConfed && !isNation;

  const title = isPlayer
    ? `${currentData.first_name || ''} ${currentData.second_name || ''}`.trim() ||
      currentData.common_name ||
      'Unnamed Player'
    : isVirtual
      ? currentData.virtual_type === 'EXTINCT' ||
        currentData.id === '[EXTINCT]' ||
        String(currentData.id).startsWith('ext-')
        ? 'Extinct Clubs'
        : 'Other Clubs'
      : currentData.name_sh || currentData.name_lg || currentData.name || 'Unnamed';

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

  const getTypeColor = () => {
    if (isInternationalComp) return 'purple';
    if (isVirtual)
      return currentData.virtual_type === 'EXTINCT' || currentData.id === '[EXTINCT]'
        ? 'volcano'
        : 'geekblue';
    if (isComp) return 'gold';
    if (isClub) return 'blue';
    if (isNation) return 'cyan';
    if (isPlayer) return 'purple';
    if (isStadium) return 'green';
    if (isCity) return 'geekblue';
    if (isAward) return 'warning';
    return 'default';
  };

  const getTypeBadgeStyles = () => {
    if (isInternationalComp) return 'bg-purple-50/90 border-purple-300 text-purple-600';
    if (isComp) return 'bg-amber-50/90 border-amber-300 text-amber-600';
    if (isClub) return 'bg-blue-50/90 border-blue-300 text-blue-600';
    if (isNation) return 'bg-cyan-50/90 border-cyan-300 text-cyan-600';
    if (isPlayer) return 'bg-purple-50/90 border-purple-300 text-purple-600';
    if (isStadium) return 'bg-emerald-50/90 border-emerald-300 text-emerald-600';
    if (isCity) return 'bg-sky-50/90 border-sky-300 text-sky-600';
    if (isAward) return 'bg-yellow-50/90 border-yellow-400 text-yellow-600';
    if (isVirtual) return 'bg-orange-50/90 border-orange-300 text-orange-600';
    return 'bg-slate-50/90 border-slate-300 text-slate-600';
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

  // Nation resolving: If it's a nation, currentData.id is the nation id
  const nationId = isNation
    ? currentData.id
    : currentData.nation_id || currentData.country_id || currentData.nation?.id;
  const nationName = isNation
    ? currentData.name_lg || currentData.name || currentData.name_sh
    : currentData.nation?.name_lg || currentData.nation?.name || currentData.nation?.name_sh;
  const nationCode = isNation
    ? currentData.name_3l || currentData.code
    : currentData.nation?.name_3l;

  // Normalize API Record Type
  const getNormalizedRecordType = (): RecordType => {
    if (isComp) return RecordType.COMPETITION;
    if (isClub) return RecordType.CLUB;
    if (isStadium) return RecordType.STADIUM;
    if (isCity) return RecordType.CITY;
    if (isAward) return RecordType.AWARD;
    if (isPlayer) return RecordType.PLAYER;
    return RecordType.COMPETITION;
  };

  // Handle Save (Create or Update)
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const recType = getNormalizedRecordType();
      const payload: any = { ...formData };

      if (mode === 'create') {
        payload.id = String(formData.id || '').trim();
        if (!payload.id) {
          throw new Error('FM ID is required');
        }
      }

      // Validations & Unified Name Mapping (name, name_lg, name_sh, name_6l, name_3l)
      const nLg = (payload.name_lg || '').trim();
      const nSh = (payload.name_sh || nLg).trim();
      const n6l = (payload.name_6l || '').trim();
      const n3l = (payload.name_3l || '').trim().toUpperCase();
      const nName = (payload.name || nLg || nSh || '').trim();

      if (isCity || isStadium) {
        payload.name = nName;
        payload.name_lg = null;
        payload.name_sh = null;
        payload.name_6l = null;
        payload.name_3l = null;
        if (!nName) throw new Error('Please enter Name');
      } else if (isPlayer) {
        if (!payload.first_name?.trim()) throw new Error('Please enter First Name');
        if (!payload.second_name?.trim()) throw new Error('Please enter Second Name');
      } else if (isAward) {
        payload.name = nLg;
        payload.name_lg = nLg;
        payload.name_sh = nSh;
        payload.name_6l = null;
        payload.name_3l = null;
        if (!nLg) throw new Error('Please enter Long Name (LN)');
      } else if (isClub) {
        payload.name = nLg;
        payload.name_lg = nLg;
        payload.name_sh = nSh;
        payload.name_6l = n6l || null;
        payload.name_3l = n3l || null;
        if (!nLg) throw new Error('Please enter Long Name (LN)');
      } else {
        // Nation, Comp
        payload.name = nLg;
        payload.name_lg = nLg;
        payload.name_sh = nSh;
        payload.name_6l = null;
        payload.name_3l = n3l || null;
        if (!nLg) throw new Error('Please enter Long Name (LN)');
      }

      if (isComp) {
        payload.fg_color = payload.fg_color?.trim() || null;
        payload.bg_color = payload.bg_color?.trim() || null;
        payload.parent_id = formData.parent_id?.trim() ? String(formData.parent_id).trim() : null;
        payload.type = (formData.type || formData.categories || '').trim() || null;
      }

      if (isClub) {
        const affId = (formData.affiliate_club_id || formData.parent_id)?.trim() || null;
        const affType = (formData.affiliate_club_type || formData.affiliate_type)?.trim().toUpperCase() || null;
        payload.affiliate_club_id = affId;
        payload.affiliate_club_type = affType;
        payload.parent_id = affId;
        payload.affiliate_type = affType;
      }

      if (isCity) {
        payload.region_id = formData.region_id && String(formData.region_id) !== 'all' ? Number(formData.region_id) : null;
      }

      if (isRegion) {
        payload.name = formData.name || formData.name_lg;
        payload.code = formData.code?.trim() || null;
        payload.nation_id = formData.nation_id || null;
      }

      if (isCity || isStadium) {
        payload.is_disabled = !!formData.is_disabled;
      }
      if (isStadium) {
        payload.type = formData.type || 'stadium';
      }

      if (mode === 'create') {
        await createRecord(recType, payload);
        message.success('Record created successfully!');
        triggerRefresh();
        onSuccess?.();
        onClose();
      } else {
        await updateRecord(recType, String(currentData.id), payload);
        message.success('Record updated successfully!');
        const updated = { ...currentData, ...payload };
        setCurrentData(updated);
        triggerRefresh();
        onSuccess?.();
        setIsQuickEditing(false);
        setMode('view');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to save record');
      message.error(err.message || 'Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(currentData);
      } else {
        const recType = getNormalizedRecordType();
        await deleteRecord(recType, String(currentData.id));
      }
      message.success('Record deleted successfully!');
      triggerRefresh();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={(e) => {
        e?.stopPropagation?.();
        onClose();
      }}
      getContainer={() => document.getElementById('mobile-frame-root') || document.body}
      width="100%"
      style={{ width: '100%', maxWidth: 'calc(100% - 20px)', margin: '0 auto' }}
      destroyOnHidden
      centered
      className="record-detail-modal"
      title={
        <div
          className={`flex items-center gap-2.5 sm:gap-3 pb-2.5 pr-7 min-w-0 transition-all duration-200 border-b ${
            hasScroll && !isScrolledTop
              ? 'border-slate-200/90 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.06)]'
              : 'border-slate-100'
          }`}
        >
          {/* Thẻ icon có viền rõ ràng */}
          <Tooltip title={getTypeLabel()} placement="bottom">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-default p-0 shadow-2xs border ${getTypeBadgeStyles()}`}
            >
              {getTypeIcon(18)}
            </div>
          </Tooltip>

          {/* 2 dòng: (id, text name) */}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            {/* Dòng 1: id */}
            <div className="flex items-center gap-2">
              {mode !== 'create' && currentData.id !== undefined && currentData.id !== null && (
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

            {/* Dòng 2: text name (in hoa) */}
            <div className="mt-1 min-w-0">
              {mode === 'create' ? (
                <span className="font-bold text-xs sm:text-sm text-slate-900 uppercase truncate block">
                  Add New {getTypeLabel()}
                </span>
              ) : (
                <div
                  className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                  title={title}
                >
                  <span>{title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      }
      footer={
        mode === 'view' ? (
          <div
            className={`flex items-center justify-end gap-2 pt-2.5 transition-all duration-200 border-t ${
              hasScroll && !isScrolledBottom
                ? 'border-slate-200/90 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]'
                : 'border-slate-100'
            }`}
          >
            {!isQuickEditing && (
              <Button
                key="close"
                icon={<CloseOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="font-medium px-4 h-9 rounded-lg border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center gap-1.5"
              >
                <span>Close</span>
              </Button>
            )}
            {canDelete && !isQuickEditing && (
              <Popconfirm
                title="Delete Record"
                description={`Are you sure you want to delete "${title}"?`}
                onConfirm={handleDeleteRecord}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true, loading: isDeleting }}
              >
                <Button
                  key="delete"
                  danger
                  icon={<DeleteOutlined />}
                  loading={isDeleting}
                  className="font-medium px-4 h-9 rounded-lg flex items-center justify-center gap-1.5"
                >
                  <span>Delete</span>
                </Button>
              </Popconfirm>
            )}
            {canEdit && !isQuickEditing && (
              <Button
                key="edit"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  if (isClub) setIsQuickEditing(true);
                  else setMode('edit');
                }}
                className="font-medium px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>Edit</span>
              </Button>
            )}
            {canEdit && isClub && isQuickEditing && (
              <>
                <Button
                  key="cancel-quick-edit"
                  icon={<CloseOutlined />}
                  disabled={isSaving}
                  onClick={() => {
                    setFormData((previous: any) => ({
                      ...previous,
                      name_lg: currentData.name_lg || currentData.name || '',
                      name_sh: currentData.name_sh || '',
                      name_6l: currentData.name_6l || '',
                      name_3l: currentData.name_3l || currentData.code || '',
                    }));
                    setIsQuickEditing(false);
                  }}
                  className="font-medium px-4 h-9 rounded-lg min-w-24"
                >
                  <span>Cancel</span>
                </Button>
                <Button
                  key="save-quick-edit"
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={isSaving}
                  onClick={handleSave}
                  className="font-medium px-4 h-9 rounded-lg min-w-32 bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  <span>Save Changes</span>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center justify-end gap-2 pt-2.5 transition-all duration-200 border-t ${
              hasScroll && !isScrolledBottom
                ? 'border-slate-200/90 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.06)]'
                : 'border-slate-100'
            }`}
          >
            <Button
              key="cancel"
              icon={<CloseOutlined />}
              onClick={() => {
                if (isCreate) onClose();
                else setMode('view');
              }}
              className="font-medium px-4 h-9 rounded-lg border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400 flex items-center justify-center gap-1.5"
            >
              <span>Cancel</span>
            </Button>
            <Button
              key="save"
              type="primary"
              icon={<SaveOutlined />}
              loading={isSaving}
              onClick={handleSave}
              className="font-medium px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>{isCreate ? 'Create' : 'Save Changes'}</span>
            </Button>
          </div>
        )
      }
    >
      <div
        ref={scrollRef}
        onScroll={checkScrollState}
        className={`py-2 max-h-[60vh] overflow-y-auto transition-all duration-150 modal-scroll-container ${
          hasScroll ? 'has-scroll pl-0.5 sm:pl-1 pr-2 sm:pr-2.5' : 'no-scroll px-0.5 sm:px-1'
        }`}
      >
        {errorMessage && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-2.5 text-xs mb-3 flex items-center gap-2">
            <InfoCircleOutlined className="text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. VIEW MODE: Sleek semantic cards */}
        {mode === 'view' ? (
          <div className="space-y-3">
            {/* Primary Details Card */}
            <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3.5 sm:p-4 shadow-2xs space-y-1.5">
              {isClub && (
                <div className="mb-2.5 rounded-lg bg-sky-700 px-3 py-2 text-center text-[13px] font-bold uppercase tracking-wide text-white shadow-sm">
                  Team Information
                </div>
              )}
              {/* Names Block */}
              {/* Names Block */}
              {isPlayer ? (
                <>
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass('first_name', 'pt-0.5')}>F-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass('first_name')} line-clamp-3 break-words text-left`}
                    >
                      {currentData.first_name || '-'}
                    </span>
                  </div>

                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass('second_name', 'pt-0.5')}>S-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass('second_name')} line-clamp-3 break-words text-left`}
                    >
                      {currentData.second_name || '-'}
                    </span>
                  </div>

                  {currentData.common_name && (
                    <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                      <span className={getLabelClass('common_name', 'pt-0.5')}>C-NAME:</span>
                      <span
                        className={`font-bold text-[12px] ${getValueClass('common_name', 'text-purple-700')} italic line-clamp-3 break-words text-left`}
                      >
                        {currentData.common_name}
                      </span>
                    </div>
                  )}
                </>
              ) : isCity || isStadium ? (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass(['name', 'name_lg'], 'pt-0.5')}>NAME:</span>
                  <span
                    className={`font-bold text-[12px] ${getValueClass(['name', 'name_lg'])} line-clamp-3 break-words text-left`}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                    title={currentData.name || currentData.name_lg || '-'}
                  >
                    {currentData.name || currentData.name_lg || '-'}
                  </span>
                </div>
              ) : isClub ? (
                <>
                  {/* LN */}
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md bg-white/75 px-2.5 py-2">
                    <span className={`${getLabelClass(['name_lg', 'name'])} text-right`}>L-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
                      style={isQuickEditing ? undefined : {
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={
                        currentData.is_virtual
                          ? '-'
                          : currentData.name_lg || currentData.name || title
                      }
                    >
                      {currentData.is_virtual ? '-' : isQuickEditing ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Input.TextArea
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            value={formData.name_lg}
                            onChange={(e) => setFormData({ ...formData, name_lg: e.target.value })}
                            className="!resize-none !text-[12px] font-semibold flex-1 min-w-0"
                          />
                          <Tooltip title="Inactive field">
                            <Checkbox
                              aria-label="Mark long name as inactive"
                              checked={quickInactiveFields.includes('name_lg')}
                              onChange={(e) => toggleQuickInactive('name_lg', e.target.checked)}
                              className="shrink-0"
                            />
                          </Tooltip>
                        </div>
                      ) : currentData.name_lg || currentData.name || title}
                    </span>
                  </div>

                  {/* SN */}
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md px-2.5 py-2">
                    <span className={`${getLabelClass(['name_sh'])} text-right`}>S-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
                      style={isQuickEditing ? undefined : {
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={currentData.is_virtual ? '-' : currentData.name_sh || '-'}
                    >
                      {currentData.is_virtual ? '-' : isQuickEditing ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Input.TextArea
                            autoSize={{ minRows: 1, maxRows: 4 }}
                            value={formData.name_sh}
                            onChange={(e) => setFormData({ ...formData, name_sh: e.target.value })}
                            className="!resize-none !text-[12px] font-semibold flex-1 min-w-0"
                          />
                          <Tooltip title="Inactive field">
                            <Checkbox
                              aria-label="Mark short name as inactive"
                              checked={quickInactiveFields.includes('name_sh')}
                              onChange={(e) => toggleQuickInactive('name_sh', e.target.checked)}
                              className="shrink-0"
                            />
                          </Tooltip>
                        </div>
                      ) : currentData.name_sh || '-'}
                    </span>
                  </div>

                  {/* 6N */}
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md bg-white/75 px-2.5 py-2">
                    <span className={`${getLabelClass(['name_6l'])} text-right`}>
                      6L-NAME:
                    </span>
                    <span
                      className={`font-mono font-bold text-[12px] ${getValueClass(['name_6l'])} break-words text-left`}
                    >
                      {isQuickEditing ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Input
                            size="large"
                            value={formData.name_6l}
                            onChange={(e) => setFormData({ ...formData, name_6l: e.target.value })}
                            onPressEnter={handleSave}
                            className="!text-[12px] font-semibold flex-1 min-w-0"
                          />
                          <Tooltip title="Inactive field">
                            <Checkbox
                              aria-label="Mark six-letter name as inactive"
                              checked={quickInactiveFields.includes('name_6l')}
                              onChange={(e) => toggleQuickInactive('name_6l', e.target.checked)}
                              className="shrink-0"
                            />
                          </Tooltip>
                        </div>
                      ) : currentData.name_6l || '-'}
                    </span>
                  </div>

                  {/* 3N */}
                  <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md px-2.5 py-2">
                    <span
                      className={`${getLabelClass(['name_3l', 'code'])} text-right`}
                    >
                      3L-NAME:
                    </span>
                    <span
                      className={`font-mono font-bold text-[12px] ${getValueClass(['name_3l', 'code'])} break-words text-left`}
                    >
                      {currentData.is_virtual ? '-' : isQuickEditing ? (
                        <div className="flex items-center gap-2 min-w-0">
                          <Input
                            size="large"
                            maxLength={3}
                            value={formData.name_3l}
                            onChange={(e) => setFormData({ ...formData, name_3l: e.target.value })}
                            onPressEnter={handleSave}
                            className="!text-[12px] font-semibold uppercase flex-1 min-w-0"
                          />
                          <Tooltip title="Inactive field">
                            <Checkbox
                              aria-label="Mark three-letter name as inactive"
                              checked={quickInactiveFields.includes('name_3l')}
                              onChange={(e) => toggleQuickInactive('name_3l', e.target.checked)}
                              className="shrink-0"
                            />
                          </Tooltip>
                        </div>
                      ) : currentData.name_3l || currentData.code || '-'}
                    </span>
                  </div>
                </>
              ) : isAward ? (
                <>
                  {/* LN */}
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['name_lg', 'name'], 'pt-0.5')}>L-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={currentData.name_lg || currentData.name || title}
                    >
                      {currentData.name_lg || currentData.name || title}
                    </span>
                  </div>

                  {/* SN */}
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['name_sh'], 'pt-0.5')}>S-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={currentData.name_sh || currentData.name || '-'}
                    >
                      {currentData.name_sh || currentData.name || '-'}
                    </span>
                  </div>
                </>
              ) : (
                /* Nation, Comp */
                <>
                  {/* LN */}
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['name_lg', 'name'], 'pt-0.5')}>L-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_lg', 'name'], 'text-slate-900')} line-clamp-3 break-words text-left`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={
                        currentData.is_virtual
                          ? '-'
                          : currentData.name_lg || currentData.name || title
                      }
                    >
                      {currentData.is_virtual
                        ? '-'
                        : currentData.name_lg || currentData.name || title}
                    </span>
                  </div>

                  {/* SN */}
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['name_sh'], 'pt-0.5')}>S-NAME:</span>
                    <span
                      className={`font-bold text-[12px] ${getValueClass(['name_sh'])} line-clamp-3 break-words text-left`}
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={currentData.is_virtual ? '-' : currentData.name_sh || '-'}
                    >
                      {currentData.is_virtual ? '-' : currentData.name_sh || '-'}
                    </span>
                  </div>

                  {/* 3N */}
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span
                      className={getLabelClass(['name_3l', 'code'], 'pt-0.5')}
                    >
                      3L-NAME:
                    </span>
                    <span
                      className={`font-mono font-bold text-[12px] ${getValueClass(['name_3l', 'code'])} break-words text-left`}
                    >
                      {currentData.is_virtual
                        ? '-'
                        : currentData.name_3l || nationCode || '-'}
                    </span>
                  </div>
                </>
              )}

              {/* Confederation (for International Competition) */}
              {isInternationalComp && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
                  <span className={getLabelClass(['confed_id', 'confed'], 'pt-0.5')}>
                    CONFED:
                  </span>
                  <span
                    className={`font-bold text-[12px] ${getValueClass(['confed_id', 'confed'])} break-words text-left`}
                  >
                    {confedName}
                  </span>
                </div>
              )}

              {/* Associated Nation */}
              {!isNation && !isInternationalComp && nationId && (
                <div className={isClub
                  ? 'grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md bg-white/75 px-2.5 py-2'
                  : 'grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90'}>
                  <span className={`${getLabelClass(['nation_id', 'country_id', 'nation'], isClub ? '' : 'pt-0.5')} ${isClub ? 'text-right' : ''}`}>
                    NATION:
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 text-left">
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
                      className={`font-bold text-xs sm:text-[13px] ${getValueClass(['nation_id', 'country_id', 'nation'])} truncate`}
                    >
                      {nationName}
                    </span>
                  </div>
                </div>
              )}

              {/* Region (City) */}
              {isCity && currentData.region && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass('region', 'pt-0.5')}>
                    Region:
                  </span>
                  <div
                    className={`flex items-center gap-1 font-semibold text-xs ${getValueClass('region', 'text-sky-700')}`}
                  >
                    <EnvironmentOutlined
                      className={
                        isFieldInactive('region')
                          ? 'text-red-500'
                          : 'text-sky-500'
                      }
                    />
                    <span>
                      {String(currentData.region?.name || currentData.region_name || currentData.region).replace(/^\[[^\]]+\]\s*/, '').trim()}
                    </span>
                  </div>
                </div>
              )}

              {/* Assigned Competition / League for Club */}
              {isClub && (
                <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 min-w-0 rounded-md px-2.5 py-2">
                  <span className={`${getLabelClass(['comp_id', 'competition_id'])} text-right`}>
                    COMP:
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 text-left">
                    {currentData.is_extinct ? (
                      <Tag color="red" className="m-0 font-bold text-xs py-0 px-1">
                        EXT
                      </Tag>
                    ) : currentData.comp_id ? (
                      <>
                        <DomesticCompIcon size={12} className="text-amber-500 shrink-0" />
                        <span
                          className={`font-bold text-xs sm:text-[13px] ${getValueClass(['comp_id', 'competition_id'])} line-clamp-3 break-words`}
                        >
                          {currentData.comp?.name_sh ||
                            currentData.comp?.name_lg ||
                            currentData.comp?.name ||
                            `Competition ${currentData.comp_id}`}
                        </span>
                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          ({currentData.comp_id})
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 font-bold text-xs">-</span>
                    )}
                  </div>
                </div>
              )}

              {/* Club Affiliate Info (Đội 1 & Loại đội con) */}
              {isClub && (currentData.affiliate?.id || currentData.affiliate?.name_lg || currentData.affiliate?.name_sh || currentData.affiliate?.type) && (
                <>
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
                      Affiliate Club:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-[13px] text-slate-800">
                        {currentData.affiliate?.name_lg ||
                          currentData.affiliate?.name_sh ||
                          currentData.affiliate?.name ||
                          `Club #${currentData.affiliate?.id}`}
                      </span>
                      {currentData.affiliate?.id && (
                        <span className="text-[11px] font-mono text-slate-400">
                          (ID: {currentData.affiliate?.id})
                        </span>
                      )}
                    </div>
                  </div>
                  {currentData.affiliate?.type && (
                    <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                      <span className={getLabelClass(['affiliate_club'], 'pt-0.5')}>
                        Affiliate Type:
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

              {/* First Team Affiliates list */}
              {isClub && currentData.affiliates && currentData.affiliates.length > 0 && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass(['affiliates'], 'pt-0.5')}>
                    Affiliates ({currentData.affiliates.length}):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentData.affiliates.map((aff: any) => {
                      const affT = aff.affiliate_club?.type;
                      return (
                        <span
                          key={aff.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {affT && (
                            <span className="font-bold text-sky-600">[{affT}]</span>
                          )}
                          <span>{aff.name_sh || aff.name_lg || aff.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({aff.id})</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Type (Stadium) */}
              {isStadium && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass('type', 'pt-0.5')}>Type:</span>
                  <div className="flex items-center gap-1.5 text-left">
                    <Tag
                      color={currentData.type === 'training pitch' ? 'cyan' : 'emerald'}
                      className="m-0 font-semibold text-xs py-0.5 px-2"
                    >
                      {currentData.type === 'training pitch' ? 'Training Pitch' : 'Stadium'}
                    </Tag>
                  </div>
                </div>
              )}

              {/* Parent Competition (for Competitions) */}
              {isComp &&
                (currentData.parent_comp ||
                  currentData.parent ||
                  currentData.parent_id ||
                  isFieldInactive(['parent_comp', 'parent_id', 'parent'])) && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass(['parent_comp', 'parent_id', 'parent'], 'pt-0.5')}>
                    Parent Comp:
                  </span>
                  <span
                    className={`font-bold text-xs sm:text-[13px] ${getValueClass(['parent_comp', 'parent_id', 'parent'])} line-clamp-3 break-words text-left`}
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

              {/* Sub-competitions count */}
              {isComp &&
                (currentData.stats?.children ?? currentData.childrenCount) !== undefined &&
                Number(currentData.stats?.children ?? currentData.childrenCount) > 0 && (
                  <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                    <span className={getLabelClass(['sub_competitions', 'children'], 'pt-0.5')}>
                      Sub-Comps:
                    </span>
                    <span className="font-bold text-xs sm:text-[13px] text-amber-600 text-left">
                      {currentData.stats?.children ?? currentData.childrenCount}
                    </span>
                  </div>
                )}

              {/* Total Competitions for Nation */}
              {currentData.totalComps !== undefined && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass('competitions', 'pt-0.5')}>Competitions:</span>
                  <span className="font-bold text-xs sm:text-[13px] text-amber-700 text-left">
                    {currentData.totalComps}
                  </span>
                </div>
              )}

              {/* Clubs Count - Hidden for International Competitions */}
              {!isInternationalComp &&
                (currentData.stats?.club ?? currentData.clubsCount) !== undefined && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass(['clubs', 'club_id'], 'pt-0.5')}>Clubs:</span>
                  <span className="font-bold text-xs sm:text-[13px] text-blue-700 text-left">
                    {currentData.stats?.club ?? currentData.clubsCount}
                  </span>
                </div>
              )}

              {/* Awards Count */}
              {(currentData.stats?.award ?? currentData.awardsCount) !== undefined && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass('awards', 'pt-0.5')}>Awards:</span>
                  <span className="font-bold text-xs sm:text-[13px] text-amber-700 text-left">
                    {currentData.stats?.award ?? currentData.awardsCount}
                  </span>
                </div>
              )}

              {/* Total Nations */}
              {currentData.totalNations !== undefined && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90">
                  <span className={getLabelClass('nations', 'pt-0.5')}>Nations:</span>
                  <span className="font-bold text-xs sm:text-[13px] text-cyan-700 text-left">
                    {currentData.totalNations}
                  </span>
                </div>
              )}

              {/* Type / Categories (Non-City) */}
              {!isCity && (currentData.type || currentData.categories) && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
                  <span className={getLabelClass(['type', 'categories', 'category'], 'pt-0.5')}>
                    Type:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap text-left">
                    {String(currentData.type || currentData.categories)
                      .split(',')
                      .map((cat: string, idx: number) => (
                        <Tag color="cyan" key={idx} className="m-0 text-xs font-medium">
                          {cat.trim()}
                        </Tag>
                      ))}
                  </div>
                </div>
              )}

              {/* BG Color Row */}
              {bgInfo && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
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
                      className={`font-mono font-bold text-xs sm:text-[13px] ${getValueClass(['bg_color', 'background_color'])}`}
                    >
                      {currentData.bg_color}
                    </span>
                  </div>
                </div>
              )}

              {/* FG Color Row */}
              {fgInfo && (
                <div className="grid grid-cols-[minmax(110px,1fr)_minmax(0,3fr)] items-start gap-4 min-w-0 pb-2 border-b border-sky-100/90 last:border-b-0 last:pb-0">
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
                      className={`font-mono font-bold text-xs sm:text-[13px] ${getValueClass(['fg_color', 'foreground_color'])}`}
                    >
                      {currentData.fg_color}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scope & Status Badges */}
            {(currentData.is_extinct ||
              isVirtual ||
              ((isCity || isStadium) && currentData.is_disabled)) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {(isCity || isStadium) && currentData.is_disabled && (
                  <Tag color="red" className="m-0 text-xs font-medium py-0.5 px-2">
                    Disabled in .lnc
                  </Tag>
                )}
                {currentData.is_extinct && (
                  <Tag color="red" className="m-0 text-xs font-medium py-0.5 px-2">
                    Extinct Club
                  </Tag>
                )}
                {isVirtual && (
                  <Tag color="orange" className="m-0 text-xs font-medium py-0.5 px-2">
                    {currentData.virtual_type === 'EXTINCT'
                      ? 'Extinct Clubs Container'
                      : 'Independent Clubs Container'}
                  </Tag>
                )}
              </div>
            )}

            {/* Notes Card */}
            {currentData.note && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-700">
                <InfoCircleOutlined className="text-sky-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-800 block mb-0.5">Note:</span>
                  <p className="italic text-slate-600 break-words m-0">{currentData.note}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 2. EDIT / CREATE MODE: INLINE FORM */
          <form onSubmit={handleSave} className="space-y-3.5 pr-0.5">
            {/* FM Unique ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UID <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                disabled={mode === 'edit'}
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="ID"
                className="font-mono rounded-lg"
                prefix={mode === 'edit' ? <LockOutlined className="text-slate-400" /> : undefined}
                required
              />
            </div>

            {/* Player Specific Fields */}
            {isPlayer ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={getFormLabelClass('first_name')}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Enter first name..."
                      className="rounded-lg"  
                      required
                    />
                  </div>
                  <div>
                    <label className={getFormLabelClass('second_name')}>
                      Second Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.second_name}
                      onChange={(e) => setFormData({ ...formData, second_name: e.target.value })}
                      placeholder="Enter second name..."
                      className="rounded-lg"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className={getFormLabelClass('common_name')}>
                    Common Name
                  </label>
                  <Input
                    value={formData.common_name}
                    onChange={(e) => setFormData({ ...formData, common_name: e.target.value })}
                    placeholder="Enter common name..."
                    className="rounded-lg"
                  />
                </div>
              </div>
            ) : isCity || isStadium ? (
              /* Name for Stadium, City */
              <div className="space-y-3">
                <div>
                  <label className={getFormLabelClass('name')}>
                    Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter name..."
                    className="rounded-lg"
                    required
                  />
                </div>

                {isStadium && (
                  <div>
                    <label className={getFormLabelClass('type')}>
                      Stadium Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={formData.type || 'stadium'}
                      onChange={(val) => setFormData({ ...formData, type: val })}
                      className="w-full"
                      options={[
                        { label: 'Stadium', value: 'stadium' },
                        { label: 'Training Pitch', value: 'training pitch' },
                      ]}
                    />
                  </div>
                )}
              </div>
            ) : isAward ? (
              /* Award Fields: name_lg, name_sh */
              <div className="space-y-3">
                <div>
                  <label className={getFormLabelClass(['name_lg', 'name'])}>
                    Long name<span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name_lg ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_lg: e.target.value,
                      })
                    }
                    placeholder="Enter long name..."
                    className="rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className={getFormLabelClass(['name_sh'])}>Short name</label>
                  <Input
                    value={formData.name_sh ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_sh: e.target.value,
                      })
                    }
                    placeholder="Enter short name..."
                    className="rounded-lg"
                  />
                </div>
              </div>
            ) : isClub ? (
              /* Club Fields: name_lg, name_sh, name_6l, name_3l */
              <div className="space-y-3">
                <div>
                  <label className={getFormLabelClass(['name_lg', 'name'])}>
                    Long name<span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name_lg ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_lg: e.target.value,
                      })
                    }
                    placeholder="Enter long name..."
                    className="rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className={getFormLabelClass(['name_sh'])}>Short name</label>
                  <Input
                    value={formData.name_sh ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_sh: e.target.value,
                      })
                    }
                    placeholder="Enter short name..."
                    className="rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={getFormLabelClass(['name_6l'])}>
                      6-Letter name
                    </label>
                    <Input
                      value={formData.name_6l ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name_6l: e.target.value,
                        })
                      }
                      placeholder="Enter 6-letter name..."
                      maxLength={6}
                      className="font-mono rounded-lg"
                    />
                  </div>
                  <div>
                    <label className={getFormLabelClass(['name_3l', 'code'])}>
                      3-Letter name
                    </label>
                    <Input
                      value={formData.name_3l ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({
                          ...formData,
                          name_3l: val,
                        });
                      }}
                      placeholder="Enter 3-letter name..."
                      maxLength={3}
                      className="font-mono uppercase rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Nation / Competition Fields: name_lg, name_sh, name_3l */
              <div className="space-y-3">
                <div>
                  <label className={getFormLabelClass(['name_lg', 'name'])}>
                    Long name<span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name_lg ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name_lg: e.target.value,
                      })
                    }
                    placeholder="Enter long name..."
                    className="rounded-lg"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={getFormLabelClass(['name_sh'])}>Short name</label>
                    <Input
                      value={formData.name_sh ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          name_sh: e.target.value,
                        })
                      }
                      placeholder="Enter short name..."
                      className="rounded-lg"
                    />
                  </div>
                  <div>
                    <label className={getFormLabelClass(['name_3l', 'code'])}>
                      3-Letter name
                    </label>
                    <Input
                      value={formData.name_3l ?? ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setFormData({
                          ...formData,
                          name_3l: val,
                        });
                      }}
                      placeholder="Enter 3-letter name..."
                      maxLength={3}
                      className="font-mono uppercase rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Competition Colors with interactive live preview */}
            {isComp && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BgColorsOutlined className="text-amber-500" /> Color
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={getFormLabelClass(['bg_color', 'background_color'])}>
                      Background Color
                    </label>
                    <Input
                      value={formData.bg_color}
                      onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                      placeholder="R G B"
                      className="font-mono text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <label className={getFormLabelClass(['fg_color', 'foreground_color'])}>
                      Foreground Color
                    </label>
                    <Input
                      value={formData.fg_color}
                      onChange={(e) => setFormData({ ...formData, fg_color: e.target.value })}
                      placeholder="R G B"
                      className="font-mono text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Live Preview Box */}
                {(previewBgInfo || previewFgInfo) && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[11px] text-slate-400 font-medium">Live Preview:</span>
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-bold border border-black/15 shadow-2xs"
                      style={{
                        backgroundColor: previewBgInfo ? previewBgInfo.css : '#ffffff',
                        color: previewFgInfo ? previewFgInfo.css : '#000000',
                      }}
                    >
                      {formData.name_sh || formData.name_lg || formData.name || 'Preview Title'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Competition Type / Category */}
            {isComp && (
              <div>
                <label className={getFormLabelClass(['type', 'categories', 'category'])}>
                  Type / Category
                </label>
                <Input
                  value={formData.type || formData.categories}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value, categories: e.target.value })
                  }
                  placeholder="Enter type/category..."
                  className="rounded-lg"
                />
              </div>
            )}

            {/* Competition Parent ID */}
            {isComp && (
              <div>
                <label className={getFormLabelClass(['parent_id', 'parent'])}>
                  Parent Comp
                </label>
                <Input
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  placeholder="Enter parent comp ID..."
                  className="font-mono text-xs rounded-lg"
                />
              </div>
            )}

            {/* Club Affiliate Info (ID Đội 1 & Loại đội con) */}
            {isClub && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-sky-50/50 rounded-xl border border-sky-100">
                <div>
                  <label className={getFormLabelClass(['affiliate_club', 'affiliate_club_id', 'parent_id', 'parent', 'parent_club'])}>
                    Parent Club ID (ID Đội 1)
                  </label>
                  <Input
                    value={formData.affiliate_club_id || formData.parent_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        affiliate_club_id: e.target.value,
                        parent_id: e.target.value,
                      })
                    }
                    placeholder="e.g. 1300491"
                    className="font-mono text-xs rounded-lg"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    ID của đội 1 (để trống nếu là đội 1 độc lập)
                  </span>
                </div>
                <div>
                  <label className={getFormLabelClass(['affiliate_club_type', 'affiliate_type', 'type'])}>
                    Affiliate Type (Loại đội con)
                  </label>
                  <Select
                    value={formData.affiliate_club_type || formData.affiliate_type || undefined}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        affiliate_club_type: val,
                        affiliate_type: val,
                      })
                    }
                    placeholder="Chọn loại đội con..."
                    allowClear
                    showSearch
                    className="w-full text-xs"
                    options={[
                      { value: '2T', label: '2T - 2nd Team (Đội 2)' },
                      { value: 'BT', label: 'BT - B Team (Đội B)' },
                      { value: 'BAC', label: 'BAC - B Academy (Học viện B)' },
                      { value: 'U19', label: 'U19 - Under 19' },
                      { value: 'U21', label: 'U21 - Under 21' },
                      { value: 'U18', label: 'U18 - Under 18' },
                      { value: '2AC', label: '2AC - 2nd Academy' },
                      { value: 'RES', label: 'RES - Reserves (Dự bị)' },
                      { value: 'CAC', label: 'CAC - C Academy' },
                      { value: '3T', label: '3T - 3rd Team (Đội 3)' },
                      { value: 'CT', label: 'CT - C Team (Đội C)' },
                      { value: '3AC', label: '3AC - 3rd Academy' },
                      { value: 'AKA', label: 'AKA - Akademie' },
                    ]}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Loại đội liên kết (e.g. 2T, BT, BAC, U19)
                  </span>
                </div>
              </div>
            )}

            {/* City Region Selector */}
            {isCity && (
              <div>
                <label className={getFormLabelClass('region')}>
                  Region (Khu vực / Tỉnh / Bang)
                </label>
                <Select
                  value={formData.region_id || undefined}
                  onChange={(val) => {
                    const selected = cityRegions.find((r) => r.id === val);
                    setFormData({
                      ...formData,
                      region_id: val || null,
                      region: selected ? selected.name : '',
                    });
                  }}
                  placeholder="Chọn khu vực..."
                  allowClear
                  showSearch
                  className="w-full text-xs"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={cityRegions.map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </div>
            )}

            {/* Region Code for Region */}
            {isRegion && (
              <div>
                <label className={getFormLabelClass('code')}>Region Code</label>
                <Input
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. ALG-05, USA-OH"
                  className="font-mono text-xs rounded-lg"
                />
              </div>
            )}

            {/* Checkboxes: Disabled / Extinct */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {(isCity || isStadium) && (
                <Checkbox
                  checked={formData.is_disabled}
                  onChange={(e) => setFormData({ ...formData, is_disabled: e.target.checked })}
                >
                  <span className="text-xs text-red-600 font-medium">is disabled</span>
                </Checkbox>
              )}
              {isClub && (
                <Checkbox
                  checked={formData.is_extinct}
                  onChange={(e) => setFormData({ ...formData, is_extinct: e.target.checked })}
                >
                  <span className="text-xs text-slate-700 font-medium">is extinct</span>
                </Checkbox>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Note</label>
              <Input.TextArea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Enter note..."
                className="text-xs rounded-lg"
              />
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
