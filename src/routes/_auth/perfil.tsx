import { createFileRoute, Link } from '@tanstack/react-router'
import { AvatarSection } from '@/features/profile/components/avatar-section'
import { PasswordForm } from '@/features/profile/components/password-form'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { useProfile } from '@/features/profile/api'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { StateMessage } from '@/shared/ui/state-message'

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfilePage,
})

function ProfilePage() {
  const profile = useProfile()

  return (
    <main className="mx-auto max-w-3xl px-6 pt-6 pb-16 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Meu perfil</h1>
        <Link
          to="/carteiras"
          className="text-sm font-bold text-text-accent hover:underline"
        >
          Minhas carteiras
        </Link>
      </div>

      {profile.isPending ? (
        <div aria-busy="true" className="mt-6 space-y-6">
          <span className="sr-only">Carregando perfil…</span>
          <Skeleton className="h-[132px] w-full" />
          <Skeleton className="h-[330px] w-full" />
        </div>
      ) : profile.isError ? (
        <StateMessage
          tone="error"
          title="Não foi possível carregar o perfil"
          description={profile.error.message}
          action={
            <Button
              className="rounded-button"
              onClick={() => profile.refetch()}
            >
              Tentar novamente
            </Button>
          }
        />
      ) : (
        <div className="mt-6 space-y-6">
          <AvatarSection user={profile.data} />
          <ProfileForm key={profile.data.id} user={profile.data} />
          <PasswordForm />
        </div>
      )}
    </main>
  )
}
