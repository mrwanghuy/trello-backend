import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BoardRole, BoardVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';

@Injectable()
export class ListsService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async nextPosition(boardId: string): Promise<number> {
    const last = await this.prisma.list.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? 0) + 1000;
  }

  async create(userId: string, dto: CreateListDto) {
    await this.assertBoardAccess(userId, dto.boardId);
    const position =
      dto.position !== undefined ? dto.position : await this.nextPosition(dto.boardId);
    return this.prisma.list.create({
      data: {
        boardId: dto.boardId,
        title: dto.title,
        position,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateListDto) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    await this.assertBoardAccess(userId, list.boardId);
    return this.prisma.list.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    await this.assertBoardAccess(userId, list.boardId);
    await this.prisma.list.delete({ where: { id } });
    return { ok: true };
  }
}
