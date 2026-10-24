# Tamales Lupita - Control diario

Aplicación web para control de ventas diarias de un negocio de comida. Registra la producción del día, las ventas por producto y el corte de caja.

## Características

- Diseño mobile-first
- Registro de producción diaria por variedad (incrementos o total)
- Registro de ventas por producto
- Corte de caja con comparación de efectivo esperado vs. real
- Efectivo esperado calculado a partir de ventas y anticipos cobrados en efectivo

## Tecnologías

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Prisma ORM** sobre **PostgreSQL (Neon)**
- **Vercel** para hosting

## Desarrollo local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar `.env.example` a `.env` y completar las credenciales de la base de datos de **desarrollo** (ver `DATABASE_SETUP.md`).

3. Aplicar migraciones y cargar los productos base:

```bash
npm run db:deploy
npm run db:seed
```

4. Iniciar el servidor:

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:migrate` | Crea una migración en desarrollo |
| `npm run db:deploy` | Aplica migraciones pendientes |
| `npm run db:seed` | Crea los productos base |
| `npm run db:studio` | Interfaz visual de la base de datos |

## Despliegue

La URL fija de producción es **https://tamales-lupita.vercel.app**.

Cada push a `main` genera un nuevo deployment de producción y Vercel lo publica
en ese dominio. Las URLs con hash que aparecen en el dashboard son deployments
individuales; no deben usarse como enlace permanente.

Las variables `DATABASE_URL` y `DIRECT_URL` de producción se configuran en el
dashboard de Vercel, no en el repositorio. El detalle está en
`DATABASE_SETUP.md`.
