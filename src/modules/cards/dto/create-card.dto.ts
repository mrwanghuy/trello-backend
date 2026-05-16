import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCardDto {
  @ApiProperty()
  @IsString()
  listId!: string;

  @ApiProperty({ example: 'Implement login form' })
  @IsString()
  @MaxLength(500)
  title!: string;
}
