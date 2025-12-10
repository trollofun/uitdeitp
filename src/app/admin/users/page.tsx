import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UsersTable } from '@/components/admin/UsersTable';

export const metadata = {
  title: 'Gestionare Utilizatori - uitdeITP',
  description: 'Administrare utilizatori uitdeITP',
};

export default async function AdminUsersPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  // Fetch all users
  const { data: users } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch reminder counts for each user
  const usersWithCounts = await Promise.all(
    (users || []).map(async (user) => {
      const { count } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('phone_number', user.email)
        .eq('status', 'active');

      return {
        ...user,
        reminders_count: count || 0,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">👥 Gestionare Utilizatori</h1>
              <p className="text-sm text-muted-foreground">
                Administrare utilizatori și permisiuni
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-card border rounded-lg">
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">
              Toți utilizatorii ({usersWithCounts.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Gestionează rolurile și permisiunile utilizatorilor
            </p>
          </div>

          <UsersTable users={usersWithCounts} currentUserId={user.id} />
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
            💡 Despre rolurile utilizatorilor
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 ml-4 list-disc">
            <li>
              <strong>admin</strong> - Acces complet la toate funcționalitățile platformei
            </li>
            <li>
              <strong>station_manager</strong> - Poate gestiona stații și adăuga reminder-e manual
            </li>
            <li>
              <strong>user</strong> - Utilizator standard, poate gestiona propriile reminder-e
            </li>
            <li>
              Modificările de rol sunt aplicate imediat și vor afecta accesul utilizatorului
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
