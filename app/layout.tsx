import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Control de Ventas',
  description: 'Sistema de control de ventas diarias',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#374151',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              fontSize: '0.875rem',
              maxWidth: '20rem'
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
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

