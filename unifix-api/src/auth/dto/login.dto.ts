import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@uni.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'a-strong-password' })
  @IsString()
  password: string;
}
