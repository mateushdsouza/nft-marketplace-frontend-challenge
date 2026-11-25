import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cadastro')({
  component: RegistrationPage,
})

function RegistrationPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Cadastro</h1>
    </main>
  )
}
