import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Looks good to me!' })
  @IsString()
  @MaxLength(5000)
  body!: string;
}
