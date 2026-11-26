// Ícones de redes sociais do rodapé. Facebook, Twitter e LinkedIn vêm dos SVGs
// exportados do Figma; Instagram e YouTube seguem o mesmo traço. Todos usam
// currentColor para herdar a cor do link.

type IconProps = { className?: string }

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M13.33 3.32h1.83V.14C14.84.1 13.76 0 12.5 0 6.72 0 8.29 6.54 8.06 7.5H5.16v3.56h2.9V20h3.56v-8.94h2.79l.44-3.56h-3.23c.16-2.35-.63-4.18 1.71-4.18Z" />
    </svg>
  )
}

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TwitterIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 13"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M5.02 12.19c6.03 0 9.32-4.69 9.32-8.76l-.01-.4c.64-.43 1.2-.97 1.64-1.59-.59.25-1.22.41-1.88.49.68-.38 1.2-.98 1.44-1.7-.63.35-1.34.61-2.08.75A3.37 3.37 0 0 0 11.05 0C9.25 0 7.78 1.38 7.78 3.08c0 .24.03.47.08.7C5.14 3.65 2.73 2.43 1.11.56c-.28.46-.44.99-.44 1.55 0 1.07.58 2.01 1.46 2.56a3.4 3.4 0 0 1-1.48-.38v.04c0 1.49 1.13 2.73 2.63 3.02a3.48 3.48 0 0 1-1.48.05c.42 1.22 1.63 2.11 3.06 2.14A6.9 6.9 0 0 1 0 10.81a9.86 9.86 0 0 0 5.02 1.38Z" />
    </svg>
  )
}

export function LinkedinIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 15 15"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M3.13 1.56c0 .88-.69 1.57-1.57 1.57S0 2.44 0 1.56 .69 0 1.56 0s1.57.69 1.57 1.56ZM3.13 4.38H0v10h3.13v-10Zm5 0H5v10h3.13V9.13c0-2.94 3.75-3.19 3.75 0v5.25H15V8.06c0-4.94-5.56-4.75-6.87-2.31V4.38Z" />
    </svg>
  )
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 17"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M23.5 2.66A3 3 0 0 0 21.38.53C19.5 0 12 0 12 0S4.5 0 2.62.53A3 3 0 0 0 .5 2.66C0 4.54 0 8.5 0 8.5s0 3.96.5 5.84a3 3 0 0 0 2.12 2.13C4.5 17 12 17 12 17s7.5 0 9.38-.53a3 3 0 0 0 2.12-2.13C24 12.46 24 8.5 24 8.5s0-3.96-.5-5.84ZM9.6 12.1V4.9L15.9 8.5 9.6 12.1Z" />
    </svg>
  )
}
