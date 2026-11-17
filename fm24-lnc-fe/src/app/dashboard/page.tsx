'use client';

import React, { useEffect } from 'react';
import { Progress } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  EnvironmentOutlined,
  GlobalOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useApp } from '../../context/AppContext';

const TOTAL_CLUBS = 4836;
const CLUBS_WITH_CITY = 3189;
const CLUBS_MISSING_CITY = 1647;
const COVERAGE = 65.94;

const CONFEDERATIONS = [
  { code: 'UEFA', nations: 53, completed: 1898, total: 2603, coverage: 72.9 },
  { code: 'AFC', nations: 35, completed: 702, total: 1171, coverage: 59.9 },
  { code: 'CONCACAF', nations: 9, completed: 218, total: 381, coverage: 57.2 },
  { code: 'OFC', nations: 1, completed: 11, total: 25, coverage: 44.0 },
  { code: 'CONMEBOL', nations: 10, completed: 201, total: 403, coverage: 49.9 },
  { code: 'CAF', nations: 10, completed: 159, total: 253, coverage: 62.8 },
];

const COVERAGE_TIERS = [
  { label: '100% (Hoàn thành)', nations: 40, completed: 1341, total: 1341, coverage: 100.0 },
  { label: '90% đến dưới 100%', nations: 4, completed: 187, total: 202, coverage: 92.6 },
  { label: '80% đến dưới 90%', nations: 1, completed: 160, total: 179, coverage: 89.4 },
  { label: '70% đến dưới 80%', nations: 3, completed: 71, total: 97, coverage: 73.2 },
  { label: '60% đến dưới 70%', nations: 21, completed: 574, total: 887, coverage: 64.7 },
  { label: '50% đến dưới 60%', nations: 14, completed: 384, total: 717, coverage: 53.6 },
  { label: '40% đến dưới 50%', nations: 10, completed: 189, total: 429, coverage: 44.1 },
  { label: '30% đến dưới 40%', nations: 11, completed: 198, total: 539, coverage: 36.7 },
  { label: '20% đến dưới 30%', nations: 7, completed: 54, total: 213, coverage: 25.4 },
  { label: '10% đến dưới 20%', nations: 6, completed: 28, total: 196, coverage: 14.3 },
  { label: 'Dưới 10%', nations: 1, completed: 3, total: 36, coverage: 8.3 },
];

function progressColor(value: number) {
  if (value >= 90) return '#16a34a';
  if (value >= 60) return '#2563eb';
  if (value >= 40) return '#d97706';
  return '#dc2626';
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

export default function DashboardPage() {
  const { setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo } = useApp();

  useEffect(() => {
    setHeaderTitle('Dashboard');
    setHeaderId(undefined);
    setBreadcrumbs([{ title: 'Dashboard' }]);
    setBackHref(null);
    setHeaderLogo(null);
  }, [setBackHref, setBreadcrumbs, setHeaderId, setHeaderLogo, setHeaderTitle]);

  const kpis = [
    { label: 'CLB chính thức', value: formatNumber(TOTAL_CLUBS), detail: 'Không gồm Other / Extinct', icon: <TeamOutlined />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Đã có City', value: formatNumber(CLUBS_WITH_CITY), detail: `${COVERAGE.toLocaleString('vi-VN')}% tổng số CLB`, icon: <CheckCircleOutlined />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Còn thiếu City', value: formatNumber(CLUBS_MISSING_CITY), detail: '34,06% cần bổ sung', icon: <ClockCircleOutlined />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Quốc gia hoàn thành', value: '40 / 118', detail: 'Đạt độ bao phủ 100%', icon: <GlobalOutlined />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
  ];

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-5">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex flex-col gap-4 bg-gradient-to-r from-slate-900 to-blue-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-blue-200">
                <DashboardOutlined />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">CLUB_CITY_CHANGE</span>
              </div>
              <h1 className="text-xl font-bold sm:text-2xl">Tiến độ bao phủ City</h1>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">Thống kê các CLB thuộc hệ thống giải đấu chính thức từ CHECKLIST.md</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Progress type="circle" percent={COVERAGE} size={68} strokeColor="#34d399" trailColor="rgba(255,255,255,0.18)" format={(percent) => <span className="text-sm font-bold text-white">{percent}%</span>} />
              <div>
                <div className="text-xs text-slate-300">Tổng tiến độ</div>
                <div className="font-semibold text-white">{formatNumber(CLUBS_WITH_CITY)} / {formatNumber(TOTAL_CLUBS)}</div>
                <div className="mt-0.5 text-[11px] text-emerald-300">0 rd-uid còn lại</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{item.value}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${item.bg} ${item.color}`}>{item.icon}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
              <EnvironmentOutlined className="text-blue-600" />
              <div><h2 className="text-sm font-bold text-slate-800">Theo liên đoàn</h2><p className="text-[11px] text-slate-500">Mức độ hoàn thiện City của 118 quốc gia</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Liên đoàn</th><th className="px-3 py-3 text-center font-semibold">Quốc gia</th><th className="px-3 py-3 text-right font-semibold">Đã có / Tổng</th><th className="px-4 py-3 font-semibold">Tiến độ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {CONFEDERATIONS.map((item) => (
                    <tr key={item.code} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-bold text-slate-800">{item.code}</td><td className="px-3 py-3 text-center text-slate-600">{item.nations}</td><td className="px-3 py-3 text-right font-medium text-slate-700">{formatNumber(item.completed)} / {formatNumber(item.total)}</td>
                      <td className="w-[42%] px-4 py-3"><Progress percent={item.coverage} size="small" strokeColor={progressColor(item.coverage)} format={(percent) => <span className="text-[11px] font-semibold">{percent}%</span>} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3.5">
              <GlobalOutlined className="text-purple-600" />
              <div><h2 className="text-sm font-bold text-slate-800">Phân nhóm độ bao phủ</h2><p className="text-[11px] text-slate-500">Số quốc gia theo từng khoảng tiến độ</p></div>
            </div>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Nhóm tỷ lệ</th><th className="px-3 py-3 text-center font-semibold">Quốc gia</th><th className="px-3 py-3 text-right font-semibold">CLB có City</th><th className="px-4 py-3 text-right font-semibold">Tỷ lệ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {COVERAGE_TIERS.map((item) => (
                    <tr key={item.label} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{item.label}</td><td className="px-3 py-2.5 text-center font-semibold text-slate-800">{item.nations}</td><td className="px-3 py-2.5 text-right text-slate-600">{formatNumber(item.completed)} / {formatNumber(item.total)}</td>
                      <td className="px-4 py-2.5 text-right"><span className="inline-flex min-w-[52px] justify-center rounded-full px-2 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: progressColor(item.coverage) }}>{item.coverage.toFixed(1)}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
