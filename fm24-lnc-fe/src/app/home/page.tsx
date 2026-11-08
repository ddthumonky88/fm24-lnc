'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Input, Segmented } from 'antd';
import {
  GlobalOutlined,
  TrophyOutlined,
  BankOutlined,
  EnvironmentOutlined,
  StarOutlined,
  UserOutlined,
  FlagOutlined,
  RightOutlined,
  SearchOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { StadiumIcon } from '../../components/EntityIcons';
import { useApp } from '../../context/AppContext';
import {
  fetchNationsByContinent,
  fetchDomesticCompetitions,
  fetchAllClubsInNation,
  fetchCities,
  fetchStadiums,
  fetchAwards,
  fetchPlayers,
} from '../../services/api';

interface MenuCardItem {
  key: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  tagColor: string;
  countKey: string;
  countUnit: string;
}

const MENU_CARDS: MenuCardItem[] = [
  {
    key: 'NATION',
    tag: 'NATION',
    title: 'Nations',
    subtitle: 'Nations & Confeds',
    description: 'Nations, continental confederations, three-letter codes and display names.',
    href: '/list-nations',
    icon: <GlobalOutlined className="text-lg" />,
    iconBg: 'bg-blue-50 text-blue-600 border-blue-200/90 group-hover:bg-blue-600 group-hover:text-white',
    tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    countKey: 'nations',
    countUnit: 'nations',
  },
  {
    key: 'COMP',
    tag: 'COMP',
    title: 'Competitions',
    subtitle: 'Competitions',
    description: 'International competitions, domestic leagues, national cups and divisions.',
    href: '/list-comps',
    icon: <TrophyOutlined className="text-lg" />,
    iconBg: 'bg-amber-50 text-amber-600 border-amber-200/90 group-hover:bg-amber-600 group-hover:text-white',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
    countKey: 'comps',
    countUnit: 'competitions',
  },
  {
    key: 'CLUB',
    tag: 'CLUB',
    title: 'Football Clubs',
    subtitle: 'Football Clubs',
    description: 'Football clubs, reserve and affiliated teams, independent and extinct clubs.',
    href: '/list-clubs',
    icon: <BankOutlined className="text-lg" />,
    iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/90 group-hover:bg-emerald-600 group-hover:text-white',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    countKey: 'clubs',
    countUnit: 'CLB',
  },
  {
    key: 'CITY',
    tag: 'CITY',
    title: 'Cities & Regions',
    subtitle: 'Cities & Regions',
    description: 'Cities, states, provinces and regions organized by nation.',
    href: '/list-cities',
    icon: <EnvironmentOutlined className="text-lg" />,
    iconBg: 'bg-cyan-50 text-cyan-600 border-cyan-200/90 group-hover:bg-cyan-600 group-hover:text-white',
    tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    countKey: 'cities',
    countUnit: 'cities',
  },
  {
    key: 'STADIUM',
    tag: 'STADIUM',
    title: 'Stadiums',
    subtitle: 'Stadiums',
    description: 'Stadium listings, capacities and home clubs.',
    href: '/list-stadiums',
    icon: <StadiumIcon size={18} />,
    iconBg: 'bg-purple-50 text-purple-600 border-purple-200/90 group-hover:bg-purple-600 group-hover:text-white',
    tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    countKey: 'stadiums',
    countUnit: 'stadiums',
  },
  {
    key: 'AWARD',
    tag: 'AWARD',
    title: 'Awards & Honors',
    subtitle: 'Awards & Honors',
    description: 'Individual and team football awards and honors.',
    href: '/list-awards',
    icon: <StarOutlined className="text-lg" />,
    iconBg: 'bg-rose-50 text-rose-600 border-rose-200/90 group-hover:bg-rose-600 group-hover:text-white',
    tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
    countKey: 'awards',
    countUnit: 'awards',
  },
  {
    key: 'PERSON',
    tag: 'PERSON',
    title: 'Persons & Players',
    subtitle: 'Persons & Players',
    description: 'Players, coaches, referees and football personnel.',
    href: '/players',
    icon: <UserOutlined className="text-lg" />,
    iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/90 group-hover:bg-indigo-600 group-hover:text-white',
    tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    countKey: 'players',
    countUnit: 'persons',
  },
];

export default function HomePage() {
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, openSearchModal } = useApp();

  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [filterKeyword, setFilterKeyword] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setHeaderTitle('Home');
    setHeaderId(undefined);
    setBreadcrumbs([]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setBackHref, setBreadcrumbs, setHeaderId, setHeaderLogo, setHeaderTitle]);

  // Tải số lượng bản ghi bất đồng bộ
  useEffect(() => {
    let isMounted = true;

    async function loadEntityCounts() {
      const fetchers: [string, () => Promise<any>][] = [
        ['nations', () => fetchNationsByContinent('all', { page: 0, size: 1 })],
        ['comps', () => fetchDomesticCompetitions('all', { page: 0, size: 1 })],
        ['clubs', () => fetchAllClubsInNation('all', { page: 0, size: 1 })],
        ['cities', () => fetchCities(null, { page: 0, size: 1 })],
        ['stadiums', () => fetchStadiums(null, { page: 0, size: 1 })],
        ['awards', () => fetchAwards(null, { page: 0, size: 1 })],
        ['players', () => fetchPlayers({ page: 0, size: 1 })],
      ];

      await Promise.allSettled(
        fetchers.map(async ([key, fn]) => {
          try {
            const res = await fn();
            const total = res?.totalElements ?? res?.total ?? (Array.isArray(res) ? res.length : null);
            if (isMounted && total !== null && total !== undefined) {
              setCounts((prev) => ({ ...prev, [key]: Number(total) }));
            }
          } catch {
            // Ignored - fallback hiển thị không có số lượng
          }
        })
      );
    }

    loadEntityCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCards = MENU_CARDS.filter((card) => {
    if (!filterKeyword.trim()) return true;
    const q = filterKeyword.toLowerCase().trim();
    return (
      card.title.toLowerCase().includes(q) ||
      card.subtitle.toLowerCase().includes(q) ||
      card.tag.toLowerCase().includes(q) ||
      card.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-full flex flex-col min-h-0 bg-white overflow-hidden">
      {/* 1. Header Toolbar (khít chuẩn với mobile-frame 430px) */}
      <div className="shrink-0 flex-none px-3 pt-3 pb-2.5 border-b border-slate-100 bg-white space-y-2">
        {/* Layer 1: Title + View Mode Segmented */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 truncate">
              <span>FM24 LNC Data Management</span>
            </h1>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              Football database &amp; .LNC language files
            </p>
          </div>

          <Segmented
            size="small"
            value={viewMode}
            onChange={(val) => setViewMode(val as 'grid' | 'list')}
            options={[
              { value: 'grid', icon: <AppstoreOutlined /> },
              { value: 'list', icon: <UnorderedListOutlined /> },
            ]}
          />
        </div>

        {/* Layer 2: Search Box + Quick Search Button */}
        <div className="flex items-center gap-2">
          <Input
            size="middle"
            placeholder="Search menu categories..."
            allowClear
            prefix={<SearchOutlined className="text-slate-400 text-xs mr-1" />}
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            className="flex-1 text-xs bg-slate-50/80 hover:bg-white focus:bg-white rounded-lg border border-slate-200 py-1.5 px-2.5 transition-colors"
          />

          <button
            type="button"
            onClick={() => openSearchModal && openSearchModal()}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors shadow-2xs cursor-pointer select-none"
          >
            <span>Quick search</span>
            <kbd className="text-[9px] font-mono bg-white border border-slate-300 rounded px-1 py-0.5 text-slate-500 leading-none">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      {/* 2. Danh sách Card Menu (Scroll dọc mượt, 0 horizontal scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto mobile-frame-scroll px-3 py-2.5 pb-6">
        {viewMode === 'grid' ? (
          /* Chế độ Grid: Responsive từ 2 cột mobile đến 4 cột desktop */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {filteredCards.map((item) => {
              const count = counts[item.countKey];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group relative bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-2xs hover:shadow-md hover:border-blue-400 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  {/* Top: Icon + Tag */}
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0 ${item.iconBg}`}
                      >
                        {item.icon}
                      </div>

                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider border leading-none shrink-0 ${item.tagColor}`}
                      >
                        {item.tag}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <div className="mt-2 min-w-0">
                      <h2 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate leading-snug">
                        {item.title}
                      </h2>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                        {item.subtitle}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Count + Arrow */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      {count !== undefined && count !== null ? (
                        <span className="text-[11px] font-semibold text-slate-700 truncate block">
                          {count.toLocaleString()}{' '}
                          <span className="font-normal text-slate-400 text-[10px]">
                            {item.countUnit}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-block w-12 h-3 bg-slate-100 rounded animate-pulse" />
                      )}
                    </div>

                    <RightOutlined className="text-[10px] text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Chế độ List: 1 Cột thẻ ngang */
          <div className="flex flex-col gap-2">
            {filteredCards.map((item) => {
              const count = counts[item.countKey];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="group relative bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer flex items-center gap-2.5"
                >
                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 shadow-2xs shrink-0 ${item.iconBg}`}
                  >
                    {item.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {item.title}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold tracking-wider border leading-none shrink-0 ${item.tagColor}`}
                      >
                        {item.tag}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {item.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-1 text-right">
                    {count !== undefined && count !== null ? (
                      <span className="text-[11px] font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 leading-none">
                        {count.toLocaleString()}
                      </span>
                    ) : (
                      <span className="inline-block w-10 h-3 bg-slate-100 rounded animate-pulse" />
                    )}
                    <RightOutlined className="text-[10px] text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
