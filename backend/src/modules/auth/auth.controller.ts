import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard, minutes } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from './interfaces/jwt-payload.interface';

// Per-route @Throttle() limits below, keyed by caller IP (ThrottlerGuard's default) —
// tight enough to blunt brute-force/credential-stuffing/OTP-guessing/SMS-bombing, loose
// enough that a real person mistyping a password or OTP a couple of times never gets
// blocked. Only these four unauthenticated endpoints get the guard; /me and
// /change-password already require a valid JWT — a much smaller attack surface, and not
// part of the gap this fixes.
const TOO_MANY_REQUESTS = {
  status: HttpStatus.TOO_MANY_REQUESTS,
  description: 'Too many requests — wait before trying again.',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: minutes(60) } })
  @ApiOperation({
    summary:
      'Self-service sign up — the first account ever created becomes ADMIN, every one after that a MEMBER — returns a JWT',
  })
  @ApiConflictResponse({ description: 'A media team member with this phone number already exists' })
  @ApiResponse(TOO_MANY_REQUESTS)
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: minutes(1) } })
  @ApiOperation({ summary: 'Log in with phone number + password, returns a JWT' })
  @ApiUnauthorizedResponse({ description: 'Invalid phone number or password' })
  @ApiResponse(TOO_MANY_REQUESTS)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get the current authenticated media team member's identity" })
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change the current authenticated member's own password" })
  @ApiBadRequestResponse({ description: 'New password must be different from your current password' })
  changePassword(@Body() changePasswordDto: ChangePasswordDto, @CurrentUser() user: JwtPayload) {
    return this.authService.changePassword(user.sub, changePasswordDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: minutes(15) } })
  @ApiOperation({
    summary:
      'Request a password-reset code by SMS — always returns success whether or not the phone number matches an account',
  })
  @ApiResponse(TOO_MANY_REQUESTS)
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @ApiOperation({ summary: 'Reset your password using the SMS code from /auth/forgot-password' })
  @ApiBadRequestResponse({ description: 'Invalid or expired code' })
  @ApiResponse(TOO_MANY_REQUESTS)
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
