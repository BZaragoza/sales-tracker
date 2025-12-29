# Sales Tracker - Control de Ventas

Aplicación web para control de ventas diarias de un negocio de comida. Permite registrar productos vendidos durante el día y realizar el corte de caja.

## Características

- 📱 Diseño mobile-first optimizado para teléfonos
- 📊 Registro de ventas diarias por producto
- 💰 Cálculo automático de totales
- 🧾 Corte de caja con comparación de montos esperados vs reales
- 📦 Gestión de productos (crear, editar, eliminar)
- 🗄️ Base de datos SQLite (fácil migración a PostgreSQL/MySQL)

## Tecnologías

- **Next.js 14** con App Router
- **TypeScript**
- **Tailwind CSS** para estilos
- **Prisma ORM** con SQLite
- **React** con componentes del lado del cliente

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar la base de datos:
```bash
# Crear archivo .env con la URL de la base de datos
echo 'DATABASE_URL="file:./dev.db"' > .env

# Generar el cliente de Prisma
npm run db:generate

# Crear la base de datos y tablas
npm run db:push
```

3. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

4. Abrir [http://localhost:3000](http://localhost:3000) en el navegador

## Uso

### Gestión de Productos

1. Ir a "Gestionar Productos"
2. Agregar productos con nombre, precio y categoría (opcional)
3. Editar o eliminar productos según sea necesario

### Registrar Ventas

1. En la página principal, seleccionar un producto
2. Indicar la cantidad vendida
3. Hacer clic en "Agregar Venta"
4. Ver el resumen del día en tiempo real

### Corte de Caja

1. Ir a "Corte" desde la página principal
2. Revisar el resumen de ventas del día
3. Ingresar el monto real en caja
4. Agregar notas si es necesario
5. Guardar el corte (se calculará automáticamente la diferencia)

## Migración de Base de Datos

Para migrar de SQLite a PostgreSQL o MySQL:

1. Cambiar el `provider` en `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql" // o "mysql"
  url      = env("DATABASE_URL")
}
```

2. Actualizar la variable `DATABASE_URL` en `.env`

3. Ejecutar:
```bash
npm run db:push
```

## Estructura del Proyecto

```
├── app/
│   ├── api/              # API routes
│   ├── productos/        # Página de gestión de productos
│   ├── corte/            # Página de corte de caja
│   ├── layout.tsx        # Layout principal
│   ├── page.tsx          # Página principal (ventas)
│   └── globals.css       # Estilos globales
├── lib/
│   └── prisma.ts         # Cliente de Prisma
├── prisma/
│   └── schema.prisma     # Esquema de la base de datos
└── package.json
```

## Próximas Mejoras

- [ ] Autenticación de usuarios
- [ ] Historial de cortes de caja
- [ ] Reportes y estadísticas
- [ ] Exportación de datos
- [ ] Modo offline

