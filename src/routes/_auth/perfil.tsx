import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = Route.useRouteContext()
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Meu perfil</h1>
      <p className="mt-4 text-text-secondary">
        Conectado como {user.displayName} ({user.email}).
      </p>
    </main>
  )
}
