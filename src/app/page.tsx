export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">
          🚗 uitdeITP v2.0
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Platform Multi-Modal pentru Remindere ITP
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">✅ Monorepo Setup</h3>
            <p className="text-sm text-muted-foreground">
              Turborepo + pnpm workspaces
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">🎨 Shared Packages</h3>
            <p className="text-sm text-muted-foreground">
              UI, Supabase, Validation, Types
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-2">🚀 Next.js 14</h3>
            <p className="text-sm text-muted-foreground">
              App Router + Server Components
            </p>
          </div>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Status: ✅ Week 1 Infrastructure Complete</p>
          <p className="mt-2">Next: Authentication & Dashboard (Week 2)</p>
        </div>
      </div>
    </main>
  );
}
