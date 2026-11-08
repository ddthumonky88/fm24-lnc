'use client';

import React from 'react';
import { Badge } from 'antd';

export interface TabIconBadgeProps {
  icon: React.ReactNode;
  count?: number;
  showZero?: boolean;
  isActive?: boolean;
  className?: string;
  badgeColor?: string;
}

export default function TabIconBadge({
  icon,
  count,
  showZero = true,
  isActive = false,
  className = '',
  badgeColor = '#ef4444',
}: TabIconBadgeProps) {
  const cardBox = (
    <div
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shrink-0 ${
        isActive
          ? 'bg-blue-600 text-white shadow-2xs border border-blue-600'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
      } ${className}`}
    >
      {icon}
    </div>
  );

  if (count === undefined || count === null) {
    return cardBox;
  }

  return (
    <Badge
      count={count}
      showZero={showZero}
      overflowCount={99999}
      style={{
        backgroundColor: badgeColor,
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: '10px',
        height: '17px',
        minWidth: '17px',
        lineHeight: '17px',
        padding: '0 4px',
        boxShadow: '0 0 0 1.5px #ffffff',
      }}
      offset={[3, -3]}
    >
      {cardBox}
    </Badge>
  );
}

