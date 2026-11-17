'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Collapse, Empty, Input, Progress, Select, Spin } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, DashboardOutlined, GlobalOutlined, SearchOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';

const TOTAL_CLUBS = 4836;
const CLUBS_WITH_CITY = 3189;
const CLUBS_MISSING_CITY = 1647;
const COVERAGE = 65.94;

type LeagueCoverage = { id?: string; name: string; completed: number; total: number; coverage: number };
type NationCoverage = { code: string; name: string; confederation: string; completed: number; total: number; missing: number; coverage: number; leagues: LeagueCoverage[] };

function progressColor(value: number) {
  if (value >= 90) return '#16a34a';
  if (value >= 60) return '#2563eb';
  if (value >= 40) return '#d97706';
  return '#dc2626';
}

function formatNumber(value: number) { return value.toLocaleString('vi-VN'); }

function CoverageBadge({ value }: { value: number }) {
  return <span className="inline-flex min-w-[54px] justify-center rounded-full px-2 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: progressColor(value) }}>{value.toFixed(1)}%</span>;
}

export default function DashboardPage() {
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo } = useApp();
  const [nations, setNations] = useState<NationCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [confederation, setConfederation] = useState('all');

  useEffect(() => {
    setHeaderTitle('Dashboard'); setHeaderId(undefined); setBreadcrumbs([{ title: 'Dashboard' }]); setBackHref(null); setHeaderLogo(null);
  }, [setBackHref, setBreadcrumbs, setHeaderId, setHeaderLogo, setHeaderTitle]);

  useEffect(() => {
    let active = true;
    fetch('/api/dashboard-coverage')
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Không thể tải dữ liệu dashboard.');
        if (active) setNations(payload.nations || []);
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải dữ liệu dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const confederations = useMemo(() => Array.from(new Set(nations.map((nation) => nation.confederation))).sort(), [nations]);
  const filteredNations = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('vi');
    return nations.filter((nation) => (confederation === 'all' || nation.confederation === confederation) && (!keyword || nation.name.toLocaleLowerCase('vi').includes(keyword) || nation.code.toLocaleLowerCase('vi').includes(keyword) || nation.leagues.some((league) => league.name.toLocaleLowerCase('vi').includes(keyword))));
  }, [confederation, nations, query]);

  const kpis = [
    { label: 'CLB chính thức', value: formatNumber(TOTAL_CLUBS), detail: 'Không gồm Other / Extinct', icon: <TeamOutlined />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Đã có City', value: formatNumber(CLUBS_WITH_CITY), detail: `${COVERAGE.toLocaleString('vi-VN')}% tổng số CLB`, icon: <CheckCircleOutlined />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Còn thiếu City', value: formatNumber(CLUBS_MISSING_CITY), detail: '34,06% cần bổ sung', icon: <ClockCircleOutlined />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Quốc gia hoàn thành', value: `${nations.filter((item) => item.coverage === 100).length || 40} / ${nations.length || 118}`, detail: 'Đạt độ bao phủ 100%', icon: <GlobalOutlined />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  ];

  return <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-5"><div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"><div className="flex flex-col gap-4 bg-gradient-to-r from-slate-900 to-blue-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div><div className="mb-1 flex items-center gap-2 text-blue-200"><DashboardOutlined /><span className="text-xs font-semibold uppercase tracking-[0.16em]">CLUB_CITY_CHANGE</span></div><h1 className="text-xl font-bold sm:text-2xl">Tiến độ bao phủ City</h1><p className="mt-1 text-xs text-slate-300 sm:text-sm">Chi tiết theo quốc gia và từng giải đấu chính thức từ CHECKLIST.md</p></div>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><Progress type="circle" percent={COVERAGE} size={68} strokeColor="#34d399" trailColor="rgba(255,255,255,0.18)" format={(percent) => <span className="text-sm font-bold text-white">{percent}%</span>} /><div><div className="text-xs text-slate-300">Tổng tiến độ</div><div className="font-semibold text-white">{formatNumber(CLUBS_WITH_CITY)} / {formatNumber(TOTAL_CLUBS)}</div><div className="mt-0.5 text-[11px] text-emerald-300">0 rd-uid còn lại</div></div></div>
    </div></section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"><div className="flex items-start justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div><div className="mt-1 text-2xl font-bold text-slate-900">{item.value}</div><div className="mt-1 text-xs text-slate-500">{item.detail}</div></div><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${item.bg} ${item.color}`}>{item.icon}</div></div></div>)}</section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-2"><TrophyOutlined className="text-amber-500" /><div><h2 className="text-sm font-bold text-slate-800">Theo quốc gia / giải đấu</h2><p className="text-[11px] text-slate-500">Mở một quốc gia để xem tiến độ của từng giải</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Input allowClear prefix={<SearchOutlined className="text-slate-400" />} placeholder="Tìm quốc gia hoặc giải đấu" value={query} onChange={(event) => setQuery(event.target.value)} className="sm:w-72" /><Select value={confederation} onChange={setConfederation} className="sm:w-44" options={[{ value: 'all', label: 'Tất cả liên đoàn' }, ...confederations.map((item) => ({ value: item, label: item }))]} /></div></div>
      <div className="p-3 sm:p-4">{loading ? <div className="flex min-h-48 items-center justify-center"><Spin tip="Đang tải dữ liệu..." /></div> : error ? <Alert type="error" showIcon message="Không tải được dữ liệu" description={error} /> : filteredNations.length === 0 ? <Empty description="Không tìm thấy quốc gia hoặc giải đấu phù hợp" /> : <><div className="mb-3 text-xs text-slate-500">Hiển thị <strong className="text-slate-700">{filteredNations.length}</strong> / {nations.length} quốc gia</div><Collapse className="dashboard-coverage-collapse" items={filteredNations.map((nation) => ({
        key: nation.code,
        label: <div className="grid w-full grid-cols-[1fr_auto] items-center gap-3 pr-2 md:grid-cols-[minmax(220px,1fr)_110px_180px_70px]"><div className="min-w-0"><span className="mr-2 inline-flex rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">{nation.code}</span><span className="font-semibold text-slate-800">{nation.name}</span><span className="ml-2 text-[11px] text-slate-400">{nation.confederation}</span></div><div className="hidden text-center text-xs text-slate-500 md:block">{nation.leagues.length} giải</div><div className="hidden md:block"><Progress percent={nation.coverage} size="small" strokeColor={progressColor(nation.coverage)} showInfo={false} /></div><CoverageBadge value={nation.coverage} /></div>,
        children: <div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Giải đấu</th><th className="px-3 py-3 text-right font-semibold">Đã có / Tổng</th><th className="px-3 py-3 text-right font-semibold">Còn thiếu</th><th className="w-[32%] px-4 py-3 font-semibold">Tiến độ</th></tr></thead><tbody className="divide-y divide-slate-100">{nation.leagues.map((league, index) => <tr key={`${league.id || league.name}-${index}`} className="hover:bg-slate-50/80"><td className="px-4 py-3"><div className="font-medium text-slate-800">{league.name}</div>{league.id && <div className="mt-0.5 font-mono text-[10px] text-slate-400">ID: {league.id}</div>}</td><td className="px-3 py-3 text-right font-medium text-slate-700">{league.completed} / {league.total}</td><td className="px-3 py-3 text-right font-semibold text-amber-600">{league.total - league.completed}</td><td className="px-4 py-3"><Progress percent={league.coverage} size="small" strokeColor={progressColor(league.coverage)} format={(percent) => <span className="text-[11px] font-semibold">{percent}%</span>} /></td></tr>)}{nation.leagues.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Chưa có dữ liệu chi tiết giải đấu</td></tr>}</tbody><tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-700"><tr><td className="px-4 py-3">Tổng {nation.name}</td><td className="px-3 py-3 text-right">{nation.completed} / {nation.total}</td><td className="px-3 py-3 text-right text-amber-600">{nation.missing}</td><td className="px-4 py-3"><CoverageBadge value={nation.coverage} /></td></tr></tfoot></table></div>,
      }))} /></>}</div>
    </section>
  </div></div>;
}
