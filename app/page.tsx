'use client';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { useViewModel } from '@/lib/viewModel';
import { Login } from '@/components/Login';
import { TeamSetup } from '@/components/TeamSetup';
import { Dashboard } from '@/components/Dashboard';
import { AdminConsole } from '@/components/AdminConsole';
import { CreatePanel } from '@/components/CreatePanel';
import { DetailPanel } from '@/components/DetailPanel';
import { BasketDrawer, FundBar, AssignBar } from '@/components/Basket';
import { Overlays } from '@/components/Overlays';
import { Toast } from '@/components/Toast';
import { ResponsiveZoom } from '@/components/ResponsiveZoom';

export default function Page() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s._hydrated);
  const vm = useViewModel();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // avoid SSR/CSR mismatch: render nothing until localStorage is read
  if (!hydrated) return <div style={{ minHeight: '100vh', background: '#EEF2F9' }} />;

  return (
    <>
      <ResponsiveZoom />
      {vm.isLogin && <Login vm={vm} />}
      {vm.isSetup && <TeamSetup vm={vm} />}
      {vm.isDashboard && vm.isAdmin && <AdminConsole vm={vm} />}
      {vm.isDashboard && !vm.isAdmin && (
        <>
          <Dashboard vm={vm} />
          {vm.showBasket && <FundBar vm={vm} />}
          <AssignBar vm={vm} />
          {vm.basketOpen && <BasketDrawer vm={vm} />}
        </>
      )}
      {vm.modalOpen && <CreatePanel vm={vm} />}
      {vm.detailOpen && vm.detail && <DetailPanel vm={vm} />}
      <Overlays vm={vm} />
      {vm.hasToast && <Toast msg={vm.toastMsg} />}
    </>
  );
}
