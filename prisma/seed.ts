import { PrismaClient, BoardVisibility, WorkspaceRole, BoardRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@trellolite.dev' },
    update: {},
    create: {
      email: 'demo@trellolite.dev',
      name: 'Demo User',
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Workspace',
      slug: 'demo',
      ownerId: user.id,
      memberships: {
        create: { userId: user.id, role: WorkspaceRole.OWNER },
      },
    },
  });

  const existing = await prisma.board.findFirst({
    where: { workspaceId: workspace.id, title: 'Welcome Board' },
  });

  const board =
    existing ??
    (await prisma.board.create({
      data: {
        workspaceId: workspace.id,
        title: 'Welcome Board',
        visibility: BoardVisibility.WORKSPACE,
        members: { create: { userId: user.id, role: BoardRole.ADMIN } },
        lists: {
          create: [
            {
              title: 'To Do',
              position: 1000,
              cards: {
                create: [
                  { title: 'Read the docs', position: 1000 },
                  { title: 'Invite teammates', position: 2000 },
                ],
              },
            },
            { title: 'Doing', position: 2000 },
            { title: 'Done', position: 3000 },
          ],
        },
      },
    }));

  console.log('Seeded:', {
    user: user.email,
    workspace: workspace.slug,
    boardId: board.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
