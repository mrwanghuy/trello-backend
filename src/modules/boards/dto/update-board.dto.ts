import { ApiPropertyOptional } from '@nestjs/swagger';
import { BoardVisibility } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBoardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  background?: string;

  @ApiPropertyOptional({ enum: BoardVisibility })
  @IsOptional()
  @IsEnum(BoardVisibility)
  visibility?: BoardVisibility;
}
