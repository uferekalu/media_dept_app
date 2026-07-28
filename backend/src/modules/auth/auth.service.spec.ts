import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { AuthService } from './auth.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { TermiiService } from '../../common/termii/termii.service';
import { MediaTeamMemberRole } from '../../common/enums';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('new-hashed-password'),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomInt: jest.fn(),
}));

const mockMemberWithPassword = {
  _id: 'member-1',
  full_name: 'Tolu Bankole',
  phone_number: '+2348033334444',
  role: MediaTeamMemberRole.MEMBER,
  password_hash: 'hashed-password',
};

describe('AuthService', () => {
  let service: AuthService;
  let mediaTeamMembersService: {
    findByPhoneNumberWithPassword: jest.Mock;
    findByIdWithPassword: jest.Mock;
    findByPhoneNumber: jest.Mock;
    findByPhoneNumberWithResetOtp: jest.Mock;
    setResetOtp: jest.Mock;
    clearResetOtp: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
    updatePassword: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let termiiService: { sendSms: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    mediaTeamMembersService = {
      findByPhoneNumberWithPassword: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByPhoneNumber: jest.fn(),
      findByPhoneNumberWithResetOtp: jest.fn(),
      setResetOtp: jest.fn(),
      clearResetOtp: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      // Defaults to "not the first account" so the existing signup tests below don't
      // need to know about the bootstrap check unless they're specifically testing it.
      count: jest.fn().mockResolvedValue(1),
      updatePassword: jest.fn(),
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-jwt') };
    termiiService = { sendSms: jest.fn().mockResolvedValue(undefined) };
    (randomInt as jest.Mock).mockReturnValue(482913);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: MediaTeamMembersService, useValue: mediaTeamMembersService },
        { provide: JwtService, useValue: jwtService },
        { provide: TermiiService, useValue: termiiService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const dto = { phone_number: '+2348033334444', password: 'a-strong-password' };

    it('returns a signed JWT and the safe member shape on success', async () => {
      mediaTeamMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('a-strong-password', 'hashed-password');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'member-1',
        role: MediaTeamMemberRole.MEMBER,
      });
      expect(result).toEqual({
        access_token: 'signed-jwt',
        media_team_member: {
          _id: 'member-1',
          full_name: 'Tolu Bankole',
          phone_number: '+2348033334444',
          role: MediaTeamMemberRole.MEMBER,
        },
      });
      // password_hash must never leak into the response.
      expect(result.media_team_member).not.toHaveProperty('password_hash');
    });

    it('rejects with UnauthorizedException when the phone number is unknown', async () => {
      mediaTeamMembersService.findByPhoneNumberWithPassword.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects with UnauthorizedException when the password is wrong', async () => {
      mediaTeamMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it('raises the same error for an unknown phone number and a wrong password', async () => {
      mediaTeamMembersService.findByPhoneNumberWithPassword.mockResolvedValue(null);
      let unknownPhoneMessage = '';
      try {
        await service.login(dto);
      } catch (error) {
        unknownPhoneMessage = (error as UnauthorizedException).message;
      }

      mediaTeamMembersService.findByPhoneNumberWithPassword.mockResolvedValue(
        mockMemberWithPassword,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let wrongPasswordMessage = '';
      try {
        await service.login(dto);
      } catch (error) {
        wrongPasswordMessage = (error as UnauthorizedException).message;
      }

      expect(unknownPhoneMessage).toBe(wrongPasswordMessage);
    });
  });

  describe('signup', () => {
    const dto = {
      full_name: 'Tolu Bankole',
      phone_number: '+2348033334444',
      password: 'a-strong-password',
    };

    it('creates the member with role MEMBER when this is not the first account, ignoring anything else in the payload', async () => {
      mediaTeamMembersService.count.mockResolvedValue(1);
      mediaTeamMembersService.create.mockResolvedValue(mockMemberWithPassword);

      const result = await service.signup(dto);

      expect(mediaTeamMembersService.create).toHaveBeenCalledWith({
        ...dto,
        role: MediaTeamMemberRole.MEMBER,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'member-1',
        role: MediaTeamMemberRole.MEMBER,
      });
      expect(result).toEqual({
        access_token: 'signed-jwt',
        media_team_member: {
          _id: 'member-1',
          full_name: 'Tolu Bankole',
          phone_number: '+2348033334444',
          role: MediaTeamMemberRole.MEMBER,
        },
      });
    });

    it('creates the very first account ever as ADMIN (the in-app bootstrap path)', async () => {
      mediaTeamMembersService.count.mockResolvedValue(0);
      mediaTeamMembersService.create.mockResolvedValue({
        ...mockMemberWithPassword,
        role: MediaTeamMemberRole.ADMIN,
      });

      const result = await service.signup(dto);

      expect(mediaTeamMembersService.create).toHaveBeenCalledWith({
        ...dto,
        role: MediaTeamMemberRole.ADMIN,
      });
      expect(result.media_team_member.role).toBe(MediaTeamMemberRole.ADMIN);
    });

    it('propagates a duplicate-phone conflict from MediaTeamMembersService.create', async () => {
      const { ConflictException } = jest.requireActual('@nestjs/common');
      mediaTeamMembersService.create.mockRejectedValue(new ConflictException());

      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    const dto = { new_password: 'A-new-p4ssword!' };

    it('rejects when the new password is the same as the current one', async () => {
      mediaTeamMembersService.findByIdWithPassword.mockResolvedValue(mockMemberWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword('member-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mediaTeamMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('hashes and saves the new password when it differs from the current one', async () => {
      mediaTeamMembersService.findByIdWithPassword.mockResolvedValue(mockMemberWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await service.changePassword('member-1', dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('A-new-p4ssword!', 'hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('A-new-p4ssword!', 10);
      expect(mediaTeamMembersService.updatePassword).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
      );
    });

    it('rejects with UnauthorizedException if the member somehow no longer exists', async () => {
      mediaTeamMembersService.findByIdWithPassword.mockResolvedValue(null);

      await expect(service.changePassword('missing', dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mediaTeamMembersService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const dto = { phone_number: '+2348033334444' };

    it('generates, hashes, and stores an OTP, then texts the plain code', async () => {
      mediaTeamMembersService.findByPhoneNumber.mockResolvedValue(mockMemberWithPassword);

      await service.forgotPassword(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('482913', 10);
      expect(mediaTeamMembersService.setResetOtp).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
        expect.any(Date),
      );
      expect(termiiService.sendSms).toHaveBeenCalledWith(
        '+2348033334444',
        expect.stringContaining('482913'),
      );
    });

    it('does nothing when the phone number has no account, without revealing that', async () => {
      mediaTeamMembersService.findByPhoneNumber.mockResolvedValue(null);

      await expect(service.forgotPassword(dto)).resolves.toBeUndefined();
      expect(mediaTeamMembersService.setResetOtp).not.toHaveBeenCalled();
      expect(termiiService.sendSms).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = { phone_number: '+2348033334444', otp: '482913', new_password: 'A-new-p4ssword!' };
    const memberWithOtp = {
      ...mockMemberWithPassword,
      reset_otp_hash: 'hashed-otp',
      reset_otp_expires_at: new Date(Date.now() + 5 * 60 * 1000),
    };

    it('resets the password and clears the OTP when the code matches and has not expired', async () => {
      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.resetPassword(dto);

      expect(bcrypt.compare).toHaveBeenCalledWith('482913', 'hashed-otp');
      expect(mediaTeamMembersService.updatePassword).toHaveBeenCalledWith(
        'member-1',
        'new-hashed-password',
      );
      expect(mediaTeamMembersService.clearResetOtp).toHaveBeenCalledWith('member-1');
    });

    it('rejects with BadRequestException when no account matches the phone number', async () => {
      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(mediaTeamMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects with BadRequestException when there is no OTP on record', async () => {
      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(
        mockMemberWithPassword,
      );

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it('rejects with BadRequestException when the OTP has expired', async () => {
      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue({
        ...memberWithOtp,
        reset_otp_expires_at: new Date(Date.now() - 1000),
      });

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('rejects with BadRequestException when the code does not match', async () => {
      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
      expect(mediaTeamMembersService.updatePassword).not.toHaveBeenCalled();
    });

    it('raises the same error for every failure mode (no account, no OTP, expired, wrong code)', async () => {
      const messages: string[] = [];

      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(null);
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(
        mockMemberWithPassword,
      );
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue({
        ...memberWithOtp,
        reset_otp_expires_at: new Date(Date.now() - 1000),
      });
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      mediaTeamMembersService.findByPhoneNumberWithResetOtp.mockResolvedValue(memberWithOtp);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      try {
        await service.resetPassword(dto);
      } catch (error) {
        messages.push((error as BadRequestException).message);
      }

      expect(new Set(messages).size).toBe(1);
      expect(messages).toHaveLength(4);
    });
  });

  describe('getCurrentUser', () => {
    it('returns the safe member shape for a valid id', async () => {
      mediaTeamMembersService.findOne.mockResolvedValue(mockMemberWithPassword);

      const result = await service.getCurrentUser('member-1');

      expect(result).toEqual({
        _id: 'member-1',
        full_name: 'Tolu Bankole',
        phone_number: '+2348033334444',
        role: MediaTeamMemberRole.MEMBER,
      });
    });
  });
});
