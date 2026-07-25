import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { MediaTeamMemberRole } from '../../../common/enums';

export class CreateMediaTeamMemberDto {
  @ApiProperty({ example: 'Tolu Bankole' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '+2348033334444' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ enum: MediaTeamMemberRole, example: MediaTeamMemberRole.MEMBER })
  @IsEnum(MediaTeamMemberRole)
  role: MediaTeamMemberRole;

  @ApiPropertyOptional({ example: ['Camera Operation', 'Streaming/Encoding'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ format: 'password', example: 'A-strong-p4ssword!' })
  @IsString()
  @MinLength(6)
  password: string;
}
