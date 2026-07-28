import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  PASSWORD_REGEX,
  PASSWORD_REQUIREMENTS_MESSAGE,
} from '../../../common/validators/password.constants';

// Deliberately has no `role` field — the caller never gets to choose it.
// AuthService.signup() decides: the very first account ever created becomes ADMIN
// (bootstrap), every one after that becomes MEMBER. Mirrors CreateMediaTeamMemberDto
// minus role and skills — those are profile-edit-time additions, not collected at
// sign-up.
export class SignupDto {
  @ApiProperty({ example: 'Tolu Bankole' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: '+2348033334444' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({
    format: 'password',
    description: PASSWORD_REQUIREMENTS_MESSAGE,
    example: 'A-strong-p4ssword!',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_REQUIREMENTS_MESSAGE })
  password: string;
}
