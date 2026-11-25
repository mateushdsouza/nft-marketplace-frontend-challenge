export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 mb-24 max-w-content px-6 md:mb-6">
      <div className="grid gap-4 rounded-t-card bg-surface-dark px-7 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
        <p className="font-bold tracking-[0.1em]">KURIO</p>
        <p className="text-text-secondary">
          Feito para colecionadores, criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>
      <p className="rounded-b-card bg-surface py-4 text-center text-sm">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
