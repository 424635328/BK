'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvalidRoutePage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到主页
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="animate-pulse text-yellow-500 font-bold">正在重定向...</div>
    </div>
  );
}
