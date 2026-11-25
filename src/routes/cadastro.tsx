import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { AuthCard } from '@/features/auth/components/auth-card'
import { useRegister } from '@/features/auth/mutations'
import { safeRedirect } from '@/features/auth/queries'
import {
  authSearchSchema,
  redirectIfAuthenticated,
} from '@/features/auth/route-guards'
import { registerSchema, type RegisterValues } from '@/features/auth/schemas'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert, PasswordField, TextField } from '@/shared/ui/form-field'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ context, search }) =>
    redirectIfAuthenticated(context.queryClient, search.redirect),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const registerAccount = useRegister(safeRedirect(redirect))
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  const onSubmit = handleSubmit(({ username, email, password }) => {
    setFormError(null)
    registerAccount.mutate(
      { username, email, password },
      {
        onError: (error) =>
          setFormError(
            applyApiErrors(error, setError, ['username', 'email', 'password']),
          ),
      },
    )
  })

  return (
    <AuthCard
      mode="register"
      redirect={redirect}
      description="Crie seu perfil de colecionador e conecte uma carteira quando quiser."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormAlert message={formError} />
        <TextField
          id="cadastro-usuario"
          label="Nome de usuário"
          autoComplete="username"
          placeholder="seu_nome"
          error={errors.username?.message}
          {...register('username')}
        />
        <TextField
          id="cadastro-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          id="cadastro-senha"
          label="Senha"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letra e número."
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          id="cadastro-confirmar"
          label="Confirmar senha"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button
          type="submit"
          disabled={registerAccount.isPending}
          className="h-11 w-full rounded-button text-sm font-bold"
        >
          {registerAccount.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  )
}
