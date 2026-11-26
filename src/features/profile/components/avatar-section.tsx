import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { User } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { UserAvatar } from '@/shared/ui/user-avatar'
import { useRemoveAvatar, useUploadAvatar } from '../api'
import { AVATAR_TYPES, readAsDataUrl, validateAvatar } from '../schemas'

export function AvatarSection({ user }: { user: User }) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Arquivo escolhido e a URL temporária (blob:) usada na prévia.
  const [selected, setSelected] = useState<{ file: File; url: string } | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const upload = useUploadAvatar()
  const remove = useRemoveAvatar()

  // A URL blob: ocupa memória até ser revogada: o cleanup revoga quando o
  // arquivo muda, quando a escolha é cancelada ou quando a tela sai.
  useEffect(() => {
    if (!selected) return
    return () => URL.revokeObjectURL(selected.url)
  }, [selected])

  function pick(picked: File | undefined) {
    if (!picked) return
    const message = validateAvatar(picked)
    setError(message)
    setSelected(
      message ? null : { file: picked, url: URL.createObjectURL(picked) },
    )
    if (inputRef.current) inputRef.current.value = ''
  }

  function cancel() {
    setSelected(null)
    setError(null)
  }

  async function save() {
    if (!selected) return
    try {
      const dataUrl = await readAsDataUrl(selected.file)
      await upload.mutateAsync(dataUrl)
      setSelected(null)
      toast.success('Foto de perfil atualizada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    }
  }

  function removePhoto() {
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Foto de perfil removida.'),
      onError: (err) => toast.error(err.message),
    })
  }

  const busy = upload.isPending || remove.isPending

  return (
    <section
      aria-labelledby="perfil-foto"
      className="rounded-card border border-border p-5"
    >
      <h2 id="perfil-foto" className="text-lg font-bold">
        Foto de perfil
      </h2>
      <div className="mt-4 flex flex-wrap items-center gap-5">
        <UserAvatar
          name={user.displayName}
          src={selected?.url ?? user.avatarUrl}
          alt={selected ? 'Prévia da nova foto' : 'Foto de perfil'}
          className="size-20 text-2xl"
        />
        <div className="space-y-2">
          <input
            ref={inputRef}
            id="perfil-avatar"
            type="file"
            accept={AVATAR_TYPES.join(',')}
            className="sr-only"
            // o botão "Escolher foto" abre o seletor; o input fica fora do Tab
            tabIndex={-1}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? 'perfil-avatar-erro' : 'perfil-avatar-dica'
            }
            onChange={(event) => pick(event.target.files?.[0])}
          />
          {selected ? (
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-button" disabled={busy} onClick={save}>
                {upload.isPending ? 'Enviando…' : 'Salvar foto'}
              </Button>
              <Button
                variant="outline"
                className="rounded-button"
                disabled={busy}
                onClick={cancel}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                Escolher foto
              </Button>
              {user.avatarUrl && (
                <Button
                  variant="ghost"
                  className="rounded-button"
                  disabled={busy}
                  onClick={removePhoto}
                >
                  Remover foto
                </Button>
              )}
            </div>
          )}
          {error ? (
            <p
              id="perfil-avatar-erro"
              role="alert"
              className="text-xs text-coral"
            >
              {error}
            </p>
          ) : (
            <p id="perfil-avatar-dica" className="text-xs text-text-muted">
              PNG, JPG ou WebP, até 1 MB.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
