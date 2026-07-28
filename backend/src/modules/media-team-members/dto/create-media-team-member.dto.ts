import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { MediaTeamMemberRole } from '../../../common/enums';
import {
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../../../common/validators/password.constants';

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

  @ApiProperty({
    format: 'password',
    description: PASSWORD_REQUIREMENTS_MESSAGE,
    example: 'A-strong-p4ssword!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password: string;
}
