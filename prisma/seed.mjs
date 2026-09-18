import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const VARIETIES = ['Rojo', 'Rajas', 'Verde', 'Prensado', 'Frijoles', 'Dulce']
const DEFAULT_PRICE = 22

async function main() {
  for (const name of VARIETIES) {
    const existing = await prisma.product.findFirst({ where: { name } })
    if (existing) {
      console.log(`Producto existente: ${name}`)
      continue
    }
    await prisma.product.create({
      data: { name, price: DEFAULT_PRICE, category: null }
    })
    console.log(`Producto creado: ${name}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })