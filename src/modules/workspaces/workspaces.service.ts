import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkspaceMember(
    userId: string,
    workspaceId: string,
    requireRole?: WorkspaceRole[],
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    if (requireRole && !requireRole.includes(membership.role)) {
      throw new ForbiddenException('Insufficient workspace role');
    }
    return membership;
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          ownerId: userId,
        },
      });
      await tx.membership.create({
        data: {
          userId,
          workspaceId: workspace.id,
          role: WorkspaceRole.OWNER,
        },
      });
      return workspace;
    });
  }

  async listForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    await this.assertWorkspaceMember(userId, id);
    return workspace;
  }

  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    await this.assertWorkspaceMember(userId, id, [
      WorkspaceRole.OWNER,
      WorkspaceRole.ADMIN,
    ]);
    return this.prisma.workspace.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id } });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    if (workspace.ownerId !== userId) {
      throw new ForbiddenException('Only the owner may delete this workspace');
    }
    await this.prisma.workspace.delete({ where: { id } });
    return { ok: true };
  }
}
