import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Acme Inc' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'acme-inc' })
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, numbers and hyphens' })
  slug!: string;
}
