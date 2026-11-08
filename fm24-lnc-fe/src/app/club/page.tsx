'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClubIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="p-8 text-center text-gray-400">
      Redirecting to clubs list...
    </div>
  );
}
