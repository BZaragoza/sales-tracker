import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/AppShell'

export const metadata: Metadata = {
  title: 'Tamales Lupita · Control diario',
  description: 'Producción, ventas, pedidos y corte de caja de Tamales Lupita.'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              maxWidth: '20rem'
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#15803d',
                secondary: '#fff'
              }
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff'
              }
            }
          }}
        />
      </body>
    </html>
  )
}
