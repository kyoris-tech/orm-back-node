import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Roles
  await prisma.role.createMany({
    data: [
      { name: 'admin' },
      { name: 'mod' },
      { name: 'recruiter' },
    ],
    skipDuplicates: true,
  });

  // 2. Buscar role admin
  const adminRole = await prisma.role.findUnique({
    where: {
      name: 'admin',
    },
  });

  if (!adminRole) {
    throw new Error('Role admin não encontrada');
  }

  // 3. Empresa Kyoris Tech
  let company = await prisma.company.findUnique({
    where: {
      email: 'paulo.paiva@kyoristech.com',
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Kyoris Tech',
        email: 'paulo.paiva@kyoristech.com',
        apiKey: 'kyoris-tech-dev-key',
        plan: { connect: { name: 'Enterprise' } },
      },
    });
  }

  // 4. Hash da senha
  const hashedPassword = await bcrypt.hash('P@ul02026', 10);

  // 5. Usuário admin
  const existingUser = await prisma.user.findUnique({
    where: {
      email: 'paulo.paiva@kyoristech.com',
    },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        name: 'Paulo Paiva',
        email: 'paulo.paiva@kyoristech.com',
        password: hashedPassword,
        companyId: company.id,
        roleId: adminRole.id,
      },
    });
  }

  console.log('Seed executado com sucesso');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });