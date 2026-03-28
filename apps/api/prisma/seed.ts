import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.OWNER_USERNAME ?? 'owner';
  const password = process.env.OWNER_PASSWORD ?? 'ChangeMeNow_12345';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    const passwordHash = await argon2.hash(password);
    const owner = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: 'owner',
        mustChangePassword: true,
        profile: { create: { displayName: 'Owner' } },
      },
    });
    console.log(`Owner created: ${owner.username}`);
  } else {
    console.log(`Owner already exists: ${existing.username}`);
  }
}

main().finally(async () => prisma.$disconnect());
