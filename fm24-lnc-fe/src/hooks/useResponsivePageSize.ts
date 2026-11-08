'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

const MOBILE_MAX = 767;
const LARGE_MIN = 1440;

function getPageSize(width: number): number {
  if (width <= MOBILE_MAX) return 10;
  if (width >= LARGE_MIN) return 60;
  return 24;
}

export default function useResponsivePageSize(
  resetPage?: Dispatch<SetStateAction<number>>,
): [number, Dispatch<SetStateAction<number>>, boolean] {
  const [pageSize, setPageSize] = useState<number>(24);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncPageSize = () => {
      setIsReady(true);
      setPageSize((current) => {
        const next = getPageSize(window.innerWidth);
        if (current === next) return current;
        resetPage?.(1);
        return next;
      });
    };

    syncPageSize();
    window.addEventListener('resize', syncPageSize);
    return () => window.removeEventListener('resize', syncPageSize);
  }, [resetPage]);

  return [pageSize, setPageSize, isReady];
}
