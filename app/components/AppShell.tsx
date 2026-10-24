'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { businessTodayKey } from '@/lib/date'

const NAV_ITEMS = [
  { href: '/', label: 'Hoy', icon: 'home' },
  { href: '/venta', label: 'Venta', icon: 'sale' },
  { href: '/pedidos', label: 'Pedidos', icon: 'orders' },
  { href: '/corte', label: 'Corte', icon: 'register' },
  { href: '/historial', label: 'Historial', icon: 'history' }
] as const

type IconName = (typeof NAV_ITEMS)[number]['icon']

function NavIcon({ name }: { name: IconName }) {
  const common = {
    className: 'nav-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
  }

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M9.5 20v-5h5v5" />
      </svg>
    )
  }

  if (name === 'sale') {
    return (
      <svg {...common}>
        <path d="M5 7h14l-1 12H6L5 7Z" />
        <path d="M9 10V6a3 3 0 0 1 6 0v4" />
      </svg>
    )
  }

  if (name === 'orders') {
    return (
      <svg {...common}>
        <path d="M7 5h10v15l-2.5-1.5L12 20l-2.5-1.5L7 20V5Z" />
        <path d="M10 9h4M10 12.5h4" />
      </svg>
    )
  }

  if (name === 'register') {
    return (
      <svg {...common}>
        <path d="M5 7h14v13H5V7Z" />
        <path d="M8 4h8v3" />
        <path d="M8 11h8M8 15h5" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const dateLabel = format(
    new Date(`${businessTodayKey()}T12:00:00`),
    "EEEE d 'de' MMMM",
    { locale: es }
  )

  return (
    <div className="app-shell">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-blue-700 focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <header className="app-header">
        <div className="app-header-inner">
          <Link href="/" className="min-w-0" aria-label="Tamales Lupita, ir a Hoy">
            <span className="brand-name">Tamales Lupita</span>
            <span className="brand-sub">Control diario</span>
          </Link>
          <p className="header-date first-letter:uppercase">{dateLabel}</p>
        </div>
      </header>

      <main id="contenido" className="app-main">
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        <div className="bottom-nav-inner">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                aria-current={active ? 'page' : undefined}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
