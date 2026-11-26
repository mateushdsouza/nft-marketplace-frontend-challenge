import { Link } from '@tanstack/react-router'
import { useState, type ComponentType, type FormEvent } from 'react'
import type { Category } from '@/shared/api/types'
import { comingSoon } from '@/shared/lib/coming-soon'
import { CATEGORY_LABEL } from '@/shared/lib/labels'
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TwitterIcon,
  YoutubeIcon,
} from '@/shared/ui/social-icons'

const FEATURES = [
  {
    mark: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    mark: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    mark: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const FOOTER_CATEGORIES: Category[] = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'utilidade',
]

const SOCIAL: Array<[string, ComponentType<{ className?: string }>]> = [
  ['Facebook', FacebookIcon],
  ['Instagram', InstagramIcon],
  ['Twitter', TwitterIcon],
  ['LinkedIn', LinkedinIcon],
  ['YouTube', YoutubeIcon],
]

const linkClass = 'leading-[30px] hover:text-text-accent'

// Item de lista que ainda não tem página: avisa em vez de parecer que abriu.
function SoonItem({ label }: { label: string }) {
  return (
    <li>
      <button
        type="button"
        className={linkClass}
        onClick={() => comingSoon(label)}
      >
        {label}
      </button>
    </li>
  )
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Digite um e-mail válido.')
      return
    }
    setError(null)
    comingSoon('A newsletter')
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 lg:px-4">
      <h2 className="text-lg leading-tight font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="flex rounded-button bg-surface-dark shadow-[0_0_20px_rgb(10_6_4/0.45)]">
        <label htmlFor="newsletter-email" className="sr-only">
          Endereço para receber a newsletter
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="digite seu e-mail…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'newsletter-erro' : undefined}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-primary"
        />
        <button
          type="submit"
          className="rounded-r-button bg-primary px-4 text-lg font-bold text-ink hover:bg-primary-dark"
        >
          Enviar
        </button>
      </div>
      {error ? (
        <p id="newsletter-erro" role="alert" className="text-xs text-coral">
          {error}
        </p>
      ) : (
        <p className="text-[13px] leading-[22px] text-text-secondary">
          Receba lançamentos selecionados, histórias de criadores e novidades do
          mercado.
        </p>
      )}
    </form>
  )
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 mb-24 max-w-content px-6 md:mb-6">
      <div className="grid gap-8 rounded-t-card bg-surface p-8 md:grid-cols-2 lg:grid-cols-[repeat(3,1fr)_1.35fr] lg:gap-0">
        {FEATURES.map((feature) => (
          <section
            key={feature.mark}
            className="lg:border-r lg:border-primary lg:px-4 lg:first:pl-0"
          >
            <span
              aria-hidden
              className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-ink"
            >
              {feature.mark}
            </span>
            <h2 className="mt-3 text-[17px] font-bold">{feature.title}</h2>
            <p className="mt-3 max-w-52 text-sm leading-[22px] text-text-secondary">
              {feature.text}
            </p>
          </section>
        ))}
        <Newsletter />
      </div>

      <div className="grid gap-4 bg-surface-dark px-8 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
        <p className="font-bold tracking-[0.1em]">KURIO</p>
        <p className="leading-[22px]">
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>

      <div className="rounded-b-card bg-surface px-8 pt-8 pb-4">
        <div className="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-labelledby="rodape-perfil">
            <h2 id="rodape-perfil" className="mb-2 text-lg font-bold">
              Meu perfil
            </h2>
            <ul>
              <li>
                <Link to="/perfil" className={linkClass}>
                  Meu perfil
                </Link>
              </li>
              <SoonItem label="Minha coleção" />
              <SoonItem label="Atividade" />
              <SoonItem label="Estúdio do criador" />
              <SoonItem label="Lista de interesse" />
            </ul>
          </nav>
          <nav aria-labelledby="rodape-ajuda">
            <h2 id="rodape-ajuda" className="mb-2 text-lg font-bold">
              Central de ajuda
            </h2>
            <ul>
              <SoonItem label="Central de ajuda" />
              <SoonItem label="Como comprar NFTs" />
              <li>
                <Link to="/carteiras" className={linkClass}>
                  Carteira e segurança
                </Link>
              </li>
              <SoonItem label="Política do mercado" />
              <SoonItem label="Denunciar item" />
            </ul>
          </nav>
          <nav aria-labelledby="rodape-colecoes">
            <h2 id="rodape-colecoes" className="mb-2 text-lg font-bold">
              Coleções
            </h2>
            <ul>
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category}>
                  <Link
                    to="/"
                    search={{ category }}
                    hash="catalogo"
                    className={linkClass}
                  >
                    {CATEGORY_LABEL[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-8">
            <div>
              <h2 className="mb-5 text-lg font-bold">Redes sociais</h2>
              <ul className="flex gap-2.5">
                {SOCIAL.map(([name, Icon]) => (
                  <li key={name}>
                    <button
                      type="button"
                      aria-label={name}
                      onClick={() => comingSoon(`O perfil no ${name}`)}
                      className="flex size-[30px] items-center justify-center rounded-[4px] border border-primary text-primary hover:bg-primary hover:text-ink"
                    >
                      <Icon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="mb-3 text-lg font-bold">Carteiras compatíveis</h2>
              <p className="rounded-button border border-border-soft bg-surface-dark px-2 py-1.5 text-center text-[9px] font-bold tracking-[0.1px] text-text-accent">
                METAMASK • WALLETCONNECT • COINBASE
              </p>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-sm leading-[30px]">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </div>
    </footer>
  )
}
