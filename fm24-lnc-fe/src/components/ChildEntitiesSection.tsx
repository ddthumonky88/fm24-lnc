'use client';

import React from 'react';
import { RightOutlined } from '@ant-design/icons';

export interface ChildEntityItem {
  key: string;
  label: string;
  count?: number | string;
  icon: React.ReactNode;
  badgeStyles?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface ChildEntitiesSectionProps {
  title?: string;
  items: ChildEntityItem[];
  className?: string;
}

export default function ChildEntitiesSection({
  title = 'CHILD ENTITIES',
  items,
  className = '',
}: ChildEntitiesSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[10px] font-normal text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {items.length} items
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const rawCount = item.count ?? 0;
          const countNum = typeof rawCount === 'number' ? rawCount : Number(rawCount) || 0;
          const isClickable = Boolean(item.onClick && !item.disabled);

          return (
            <div
              key={item.key}
              onClick={isClickable ? item.onClick : undefined}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isClickable
                  ? 'border-slate-200/80 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-300 cursor-pointer group shadow-2xs'
                  : 'border-slate-200/60 bg-slate-50/30 opacity-70 cursor-default'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-transform ${
                    isClickable ? 'group-hover:scale-105' : ''
                  } ${item.badgeStyles || 'bg-white border-slate-200 text-slate-600'}`}
                >
                  {item.icon}
                </span>
                <span
                  className={`text-xs font-semibold truncate ${
                    isClickable ? 'text-slate-800 group-hover:text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold leading-normal border ${
                    countNum > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-mono'
                      : 'bg-slate-100 text-slate-400 border-slate-200 font-mono'
                  }`}
                >
                  {countNum.toLocaleString()}
                </span>
                {isClickable && (
                  <RightOutlined className="text-[10px] text-slate-300 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
