import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

const DEBOUNCE_MS = 350

// Busca com debounce: só escreve na URL quando o usuário para de digitar.
export function SearchBox({
  value: urlValue = '',
  onCommit,
}: {
  value?: string
  onCommit: (value: string) => void
}) {
  const [text, setText] = useState(urlValue)
  const [lastUrlValue, setLastUrlValue] = useState(urlValue)

  // Se a URL mudar por fora (voltar/avançar, limpar filtros), o campo acompanha.
  if (urlValue !== lastUrlValue) {
    setLastUrlValue(urlValue)
    setText(urlValue)
  }

  useEffect(() => {
    const next = text.trim()
    if (next === urlValue) return
    const timer = setTimeout(() => onCommit(next), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, urlValue, onCommit])

  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(event) => {
        event.preventDefault()
        onCommit(text.trim())
      }}
    >
      <label htmlFor="busca" className="sr-only">
        Buscar NFTs por nome, coleção ou token
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-secondary"
        aria-hidden
      />
      <input
        id="busca"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        className="h-12 w-full rounded-card border border-border bg-surface pr-4 pl-12 text-sm text-foreground placeholder:text-secondary focus-visible:border-primary focus-visible:outline-none"
      />
    </form>
  )
}
