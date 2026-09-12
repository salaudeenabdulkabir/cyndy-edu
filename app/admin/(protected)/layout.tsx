import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/require-admin'
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAdmin()
  if ('response' in access) redirect('/admin/login')
  return children
}
