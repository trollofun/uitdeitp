import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Redirect to stations page as the default admin view
  redirect('/admin/stations');
}
