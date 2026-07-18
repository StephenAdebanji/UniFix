import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class AssignRequestDto {
  @ApiProperty({ description: 'User id of the maintenance officer' })
  @IsInt()
  officerId: number;
}
