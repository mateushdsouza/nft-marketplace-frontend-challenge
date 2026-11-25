import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AuthCard } from '@/features/auth/components/auth-card'
import { useLogin } from '@/features/auth/mutations'
import { safeRedirect } from '@/features/auth/queries'
import {
  authSearchSchema,
  redirectIfAuthenticated,
} from '@/features/auth/route-guards'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { comingSoon } from '@/shared/lib/coming-soon'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert, PasswordField, TextField } from '@/shared/ui/form-field'

export const Route = createFileRoute('/entrar')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) =>
    redirectIfAuthenticated(context.queryClient, search.redirect),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const target = safeRedirect(redirect)
  const login = useLogin(target)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onError: (error) =>
        setFormError(applyApiErrors(error, setError, ['email', 'password'])),
    })
  })

  return (
    <AuthCard
      mode="login"
      redirect={redirect}
      description={
        target
          ? 'Entre para continuar de onde parou.'
          : 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <TextField
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          id="login-senha"
          label="Senha"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <button
            type="button"
            onClick={() => comingSoon('A recuperação de senha')}
            className="text-xs text-text-accent hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>
        <Button
          type="submit"
          disabled={login.isPending}
          className="h-11 w-full rounded-button text-sm font-bold"
        >
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="text-center text-xs text-text-secondary">
          Novo na Kurio?{' '}
          <Link
            to="/cadastro"
            search={{ redirect }}
            className="text-text-accent hover:underline"
          >
            Crie uma conta
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
