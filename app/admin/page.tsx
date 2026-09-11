import { isAdminAuthenticated } from '@/lib/adminAuth'
import { LoginForm } from './LoginForm'
import { AdminDashboard } from './AdminDashboard'

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated()

  if (!authenticated) {
    return <LoginForm />
  }

  return <AdminDashboard />
}
