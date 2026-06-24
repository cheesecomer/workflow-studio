import { WorkflowStudioPrismaClient } from '../src/index.js';

const prisma = new WorkflowStudioPrismaClient();

async function main() {
  await prisma.position.createMany({
    data: [
      { name: '社員', rank: 10 },
      { name: '主任', rank: 20 },
      { name: '課長', rank: 30 },
      { name: '部長', rank: 40 },
    ],
  });

  const director = await prisma.position.findUniqueOrThrow({
    where: { rank: 40 },
  });

  const headquarters = await prisma.department.create({
    data: { name: '本部' },
  });

  const developmentDepartment = await prisma.department.create({
    data: {
      name: '開発部',
      parentId: headquarters.id,
    },
  });

  await prisma.department.create({
    data: {
      name: '営業部',
      parentId: headquarters.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: '管理者',
      email: 'admin@example.com',
      passwordDigest: 'dummy',
    },
  });

  await prisma.departmentMembership.create({
    data: {
      userId: admin.id,
      departmentId: developmentDepartment.id,
      positionId: director.id,
      joinedAt: new Date(),
    },
  });

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
