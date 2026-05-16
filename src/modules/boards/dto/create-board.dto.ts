import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BoardVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty()
  @IsString()
  workspaceId!: string;

  @ApiProperty({ example: 'Sprint 12' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: '#0079bf' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  background?: string;

  @ApiPropertyOptional({ enum: BoardVisibility, default: BoardVisibility.WORKSPACE })
  @IsOptional()
  @IsEnum(BoardVisibility)
  visibility?: BoardVisibility;
}
