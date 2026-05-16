import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BoardRole, BoardVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertWorkspaceMember(userId: string, workspaceId: string) {
    const m = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!m) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    return m;
  }

  private async assertBoardAccess(
    userId: string,
    boardId: string,
    requireBoardRole?: BoardRole[],
  ) {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    const boardMember = await this.prisma.boardMember.findUnique({
      where: { userId_boardId: { userId, boardId } },
    });

    if (boardMember) {
      if (requireBoardRole && !requireBoardRole.includes(boardMember.role)) {
        throw new ForbiddenException('Insufficient board role');
      }
      return { board, boardMember };
    }

    if (requireBoardRole) {
      throw new ForbiddenException('Insufficient board role');
    }

    if (board.visibility === BoardVisibility.WORKSPACE) {
      const wsMember = await this.prisma.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId: board.workspaceId } },
      });
      if (wsMember) {
        return { board, boardMember: null };
      }
    }

    throw new ForbiddenException('No access to this board');
  }

  async create(userId: string, dto: CreateBoardDto) {
    await this.assertWorkspaceMember(userId, dto.workspaceId);
    return this.prisma.$transaction(async (tx) => {
      const board = await tx.board.create({
        data: {
          workspaceId: dto.workspaceId,
          title: dto.title,
          background: dto.background,
          visibility: dto.visibility ?? BoardVisibility.WORKSPACE,
        },
      });
      await tx.boardMember.create({
        data: {
          userId,
          boardId: board.id,
          role: BoardRole.ADMIN,
        },
      });
      return board;
    });
  }

  async findOne(userId: string, id: string) {
    await this.assertBoardAccess(userId, id);
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              where: { archivedAt: null },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return board;
  }

  async update(userId: string, id: string, dto: UpdateBoardDto) {
    await this.assertBoardAccess(userId, id, [BoardRole.ADMIN]);
    return this.prisma.board.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertBoardAccess(userId, id, [BoardRole.ADMIN]);
    await this.prisma.board.delete({ where: { id } });
    return { ok: true };
  }
}
