import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>
    </main>
  )
}
