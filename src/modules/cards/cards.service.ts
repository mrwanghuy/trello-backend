import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardRole, BoardVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardDto } from './dto/create-card.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardsService {
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

  private async getListOrThrow(listId: string) {
    const list = await this.prisma.list.findUnique({ where: { id: listId } });
    if (!list) {
      throw new NotFoundException('List not found');
    }
    return list;
  }

  private async getCardOrThrow(id: string) {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { list: true },
    });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return card;
  }

  private async nextPosition(listId: string): Promise<number> {
    const last = await this.prisma.card.findFirst({
      where: { listId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return (last?.position ?? 0) + 1000;
  }

  async create(userId: string, dto: CreateCardDto) {
    const list = await this.getListOrThrow(dto.listId);
    await this.assertBoardAccess(userId, list.boardId);
    const position = await this.nextPosition(dto.listId);
    return this.prisma.card.create({
      data: {
        listId: dto.listId,
        title: dto.title,
        position,
      },
    });
  }

  async findOne(userId: string, cardId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    const list = await this.getListOrThrow(card.listId);
    await this.assertBoardAccess(userId, list.boardId);
    return this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        checklists: {
          include: {
            items: { orderBy: { position: 'asc' } },
          },
        },
        labels: { include: { label: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCardDto) {
    const card = await this.getCardOrThrow(id);
    await this.assertBoardAccess(userId, card.list.boardId);
    return this.prisma.card.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : undefined,
      },
    });
  }

  async move(userId: string, id: string, dto: MoveCardDto) {
    const card = await this.getCardOrThrow(id);
    const sourceBoardId = card.list.boardId;
    const targetList = await this.getListOrThrow(dto.listId);
    if (targetList.boardId !== sourceBoardId) {
      throw new BadRequestException('Cannot move card across boards');
    }
    await this.assertBoardAccess(userId, sourceBoardId);
    return this.prisma.card.update({
      where: { id },
      data: {
        listId: dto.listId,
        position: dto.position,
      },
    });
  }

  async remove(userId: string, id: string) {
    const card = await this.getCardOrThrow(id);
    await this.assertBoardAccess(userId, card.list.boardId);
    await this.prisma.card.delete({ where: { id } });
    return { ok: true };
  }

  async addComment(userId: string, cardId: string, dto: CreateCommentDto) {
    const card = await this.getCardOrThrow(cardId);
    await this.assertBoardAccess(userId, card.list.boardId);
    return this.prisma.comment.create({
      data: {
        cardId,
        authorId: userId,
        body: dto.body,
      },
    });
  }
}
