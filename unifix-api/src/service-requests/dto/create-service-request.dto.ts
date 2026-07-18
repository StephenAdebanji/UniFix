import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RequestPriority } from '../../../generated/prisma/enums';

export class CreateServiceRequestDto {
  @ApiProperty({ example: "Broken projector in LT-2" })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Electricity' })
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({ enum: RequestPriority, default: RequestPriority.MEDIUM })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiProperty({ example: 'Lecture Theatre 3, Block B' })
  @IsString()
  location: string;

  @ApiProperty({
    example: 'The ceiling fluorescent tubes flicker throughout lectures.',
  })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiPropertyOptional({ example: 'https://.../evidence.jpg' })
  @IsOptional()
  @IsString()
  evidenceFileUrl?: string;
}
