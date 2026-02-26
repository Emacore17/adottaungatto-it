import type { ReactNode } from 'react';
import { AdminShell } from '../../components/admin-shell';
import { requireAdminRole } from '../../lib/auth';

interface AdminAreaLayoutProps {
  children: ReactNode;
}

export default async function AdminAreaLayout({ children }: AdminAreaLayoutProps) {
  await requireAdminRole('/admin');
  return <AdminShell>{children}</AdminShell>;
}
