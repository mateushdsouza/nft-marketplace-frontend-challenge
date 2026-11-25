import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/entrar')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="mx-auto max-w-content px-6 py-24">
      <h1 className="text-2xl font-bold">Login</h1>
    </main>
  )
}
