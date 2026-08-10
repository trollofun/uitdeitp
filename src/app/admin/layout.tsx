import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { requireAdmin } from '@/lib/auth/requireRole';
import { createServerClient } from '@/lib/supabase/server';
import { getUserContexts } from '@/lib/auth/contexts';

/**
 * Layout-ul panoului de administrare.
 *
 * `AppHeader` — comutatorul de context — era montat în `/dashboard` și
 * `/stations`, dar **nu aici**. Iar `landingPathFor` trimite un admin direct în
 * `/admin`. Rezultatul: exact rolul care are toate cele trei contexte ateriza în
 * singura zonă fără ieșire, iar singurul buton de scăpare („Dashboard", în
 * corpul paginii `/admin`) dispărea pe orice subpagină.
 *
 * Comutatorul exista de la început și funcționa. Era doar invizibil acolo unde
 * conta cel mai mult.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role check - redirects to /unauthorized if not admin
  const { user } = await requireAdmin();

  const contexts = await getUserContexts(createServerClient(), user.id, '/admin');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader initial={contexts} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
