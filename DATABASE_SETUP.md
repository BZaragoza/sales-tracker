# Configuración de Base de Datos

La app usa **PostgreSQL en Neon**. Se manejan dos bases de datos separadas:

| Entorno | Base de datos | Dónde se configura |
| --- | --- | --- |
| Desarrollo | `sales_tracker_dev` | archivo `.env` (local, ignorado por git) |
| Producción | `neondb` | variables de entorno en Vercel |

Así los cambios locales nunca tocan los datos de producción.

## Por qué hay dos URLs

Neon expone dos cadenas de conexión por base de datos:

- **Pooled** (`...-pooler...`): la usa la app en tiempo de ejecución. Va en `DATABASE_URL` con `?sslmode=require&pgbouncer=true`.
- **Directa** (sin `-pooler`): la usan las migraciones de Prisma. Va en `DIRECT_URL` con `?sslmode=require`.

El `schema.prisma` ya está preparado:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Desarrollo local

1. Copiar la plantilla y completar con las credenciales de la base de datos de desarrollo:

```bash
cp .env.example .env
```

2. Aplicar migraciones y cargar productos:

```bash
npm run db:deploy
npm run db:seed
```

## Producción (Vercel)

Configurar estas variables en **Vercel > Project > Settings > Environment Variables**
(entorno `Production`) con las credenciales de la base de datos de producción:

```bash
# Con el CLI de Vercel (pide login la primera vez)
npx vercel login
npx vercel env add DATABASE_URL production
npx vercel env add DIRECT_URL production
```

Durante el build, Vercel ejecuta `vercel-build`, que corre `prisma migrate deploy`
antes de `next build`. Con esto, cada despliegue aplica las migraciones pendientes
en producción automáticamente.

El seed de productos se corre una sola vez contra producción:

```bash
DATABASE_URL="<url-pooled-prod>" DIRECT_URL="<url-directa-prod>" npm run db:seed
```

## Agregar una migración nueva

```bash
# En desarrollo: crea y aplica la migración sobre sales_tracker_dev
npm run db:migrate -- --name nombre_del_cambio

# En el siguiente despliegue, Vercel la aplica en producción
```

## Seguridad

Las credenciales **nunca** se suben al repositorio. `.env`, `venv*.local` y los
archivos `*.db` están en `.gitignore`. Si alguna credencial llegó a commitearse,
hay que rotarla en Neon y Supabase y actualizar las variables en Vercel.
