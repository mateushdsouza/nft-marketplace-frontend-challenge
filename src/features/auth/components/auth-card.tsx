import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { comingSoon } from '@/shared/lib/coming-soon'
import { cn } from '@/shared/lib/utils'

const tabClass = 'text-lg md:text-xl transition-colors hover:text-text-accent'

// Mesmo visual do modal de login do Figma, como página própria.
export function AuthCard({
  mode,
  redirect,
  description,
  children,
}: {
  mode: 'login' | 'register'
  redirect?: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex max-w-content justify-center px-6 py-10 md:py-16">
      <div className="w-full max-w-[500px] overflow-hidden rounded-card bg-surface shadow-card">
        <div className="px-6 pt-8 pb-8 md:px-20">
          <h1 className="flex items-center justify-center gap-2">
            <Link
              to="/entrar"
              search={{ redirect }}
              aria-current={mode === 'login' ? 'page' : undefined}
              className={cn(
                tabClass,
                mode === 'login' && 'font-bold text-text-accent',
              )}
            >
              Entrar
            </Link>
            <span aria-hidden className="h-6 w-px bg-primary" />
            <Link
              to="/cadastro"
              search={{ redirect }}
              aria-current={mode === 'register' ? 'page' : undefined}
              className={cn(
                tabClass,
                mode === 'register' && 'font-bold text-text-accent',
              )}
            >
              Criar conta
            </Link>
          </h1>
          <p className="mt-5 text-center text-xs leading-5 text-text-secondary">
            {description}
          </p>
          <div className="mt-6">{children}</div>

          <div className="mt-6 flex items-center gap-3 text-xs">
            <span className="h-px flex-1 bg-border" />
            Ou continue com
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4 space-y-3">
            {['Google', 'Facebook'].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => comingSoon(`O login com ${provider}`)}
                className="h-10 w-full rounded-input border border-border text-xs text-text-secondary transition-colors hover:border-primary hover:text-foreground"
              >
                Continuar com {provider}
              </button>
            ))}
          </div>
        </div>
        <div aria-hidden className="h-2.5 bg-primary" />
      </div>
    </main>
  )
}
