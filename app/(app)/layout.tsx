import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import NotificationCheck from '@/components/pwa/NotificationCheck';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex h-full">
      <NotificationCheck />
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto scroll-hidden"
        style={{
          background: 'var(--bg)',
          paddingBottom: 'calc(var(--bottomnav-height) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
