import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '../../../generated/prisma/enums';

const MANUAL_STATUSES = [
  RequestStatus.IN_PROGRESS,
  RequestStatus.RESOLVED,
  RequestStatus.REJECTED,
] as const;

export class UpdateStatusDto {
  @ApiProperty({ enum: MANUAL_STATUSES })
  @IsIn(MANUAL_STATUSES)
  status: (typeof MANUAL_STATUSES)[number];

  @ApiPropertyOptional({ example: 'Parts ordered' })
  @IsOptional()
  @IsString()
  note?: string;
}
