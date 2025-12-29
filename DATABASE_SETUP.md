# Configuración de Base de Datos

## Pasos para configurar la base de datos

1. Crear el archivo `.env` en la raíz del proyecto con el siguiente contenido:

```
DATABASE_URL="file:./prisma/dev.db"
```

2. Generar el cliente de Prisma:

```bash
npm run db:generate
```

3. Crear la base de datos y las tablas:

```bash
npm run db:push
```

¡Listo! La base de datos estará configurada y lista para usar.

## Opcional: Abrir Prisma Studio

Para ver y editar datos directamente en la base de datos:

```bash
npm run db:studio
```

Esto abrirá una interfaz web en http://localhost:5555 donde podrás ver y editar los datos.

