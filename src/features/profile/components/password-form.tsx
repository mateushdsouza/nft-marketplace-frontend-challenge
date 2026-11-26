import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert, PasswordField } from '@/shared/ui/form-field'
import { useChangePassword } from '../api'
import { passwordChangeSchema, type PasswordChangeValues } from '../schemas'

const EMPTY: PasswordChangeValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export function PasswordForm() {
  const changePassword = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) => {
    setFormError(null)
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset(EMPTY)
          toast.success('Senha alterada.')
        },
        onError: (error) =>
          setFormError(
            applyApiErrors(error, setError, ['currentPassword', 'newPassword']),
          ),
      },
    )
  })

  return (
    <section
      aria-labelledby="perfil-senha"
      className="rounded-card border border-border p-5"
    >
      <h2 id="perfil-senha" className="text-lg font-bold">
        Alterar senha
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
        <FormAlert message={formError} />
        <PasswordField
          id="senha-atual"
          label="Senha atual"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            id="senha-nova"
            label="Nova senha"
            autoComplete="new-password"
            hint="Mínimo de 8 caracteres, com letra e número."
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordField
            id="senha-confirmar"
            label="Confirmar nova senha"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>
        <Button
          type="submit"
          disabled={changePassword.isPending}
          className="h-11 rounded-button px-6 text-sm font-bold"
        >
          {changePassword.isPending ? 'Alterando…' : 'Alterar senha'}
        </Button>
      </form>
    </section>
  )
}
