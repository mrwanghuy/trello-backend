import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class MoveCardDto {
  @ApiProperty()
  @IsString()
  listId!: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  position!: number;
}
