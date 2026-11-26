import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { User } from '@/shared/api/types'
import { applyApiErrors } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { FormAlert, TextField } from '@/shared/ui/form-field'
import { useUpdateProfile } from '../api'
import { profileSchema, type ProfileValues } from '../schemas'

const FIELDS = [
  'displayName',
  'username',
  'email',
  'ensName',
  'walletNickname',
] as const

function toValues(user: User): ProfileValues {
  return {
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ensName: user.ensName ?? '',
    walletNickname: user.walletNickname ?? '',
  }
}

export function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toValues(user),
  })

  const onSubmit = handleSubmit((values) => {
    setFormError(null)
    updateProfile.mutate(
      {
        ...values,
        ensName: values.ensName || null,
        walletNickname: values.walletNickname || null,
      },
      {
        onSuccess: (saved) => {
          reset(toValues(saved))
          toast.success('Perfil atualizado.')
        },
        onError: (error) =>
          setFormError(applyApiErrors(error, setError, FIELDS)),
      },
    )
  })

  return (
    <section
      aria-labelledby="perfil-dados"
      className="rounded-card border border-border p-5"
    >
      <h2 id="perfil-dados" className="text-lg font-bold">
        Dados da conta
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
        <FormAlert message={formError} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="perfil-nome"
            label="Nome de exibição"
            autoComplete="name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <TextField
            id="perfil-usuario"
            label="Nome de usuário"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            id="perfil-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            className="sm:col-span-2"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            id="perfil-ens"
            label="Nome ENS (opcional)"
            placeholder="seunome.eth"
            error={errors.ensName?.message}
            {...register('ensName')}
          />
          <TextField
            id="perfil-apelido"
            label="Apelido da carteira (opcional)"
            error={errors.walletNickname?.message}
            {...register('walletNickname')}
          />
        </div>
        <Button
          type="submit"
          disabled={updateProfile.isPending || !isDirty}
          className="h-11 rounded-button px-6 text-sm font-bold"
        >
          {updateProfile.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </form>
    </section>
  )
}
