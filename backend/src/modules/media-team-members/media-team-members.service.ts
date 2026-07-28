import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { MediaTeamMember, MediaTeamMemberDocument } from './schemas/media-team-member.schema';
import { CreateMediaTeamMemberDto } from './dto/create-media-team-member.dto';
import { UpdateMediaTeamMemberDto } from './dto/update-media-team-member.dto';

const MONGO_DUPLICATE_KEY_ERROR = 11000;
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class MediaTeamMembersService {
  constructor(
    @InjectModel(MediaTeamMember.name)
    private mediaTeamMemberModel: Model<MediaTeamMemberDocument>,
  ) {}

  async create(dto: CreateMediaTeamMemberDto): Promise<MediaTeamMemberDocument> {
    const existing = await this.mediaTeamMemberModel
      .findOne({ phone_number: dto.phone_number })
      .exec();
    if (existing) {
      throw new ConflictException(
        `A media team member with phone number ${dto.phone_number} already exists (${existing.full_name})`,
      );
    }

    const { password, ...rest } = dto;
    const password_hash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    try {
      return await this.mediaTeamMemberModel.create({ ...rest, password_hash });
    } catch (error) {
      throw this.translateDuplicateKeyError(error, dto.phone_number);
    }
  }

  findAll(): Promise<MediaTeamMemberDocument[]> {
    return this.mediaTeamMemberModel.find().sort({ full_name: 1 }).exec();
  }

  // Used only by AuthService.signup() to decide whether the very first account ever
  // created becomes ADMIN (see that method's comment) — nothing else needs a raw count.
  count(): Promise<number> {
    return this.mediaTeamMemberModel.countDocuments().exec();
  }

  // Used only by AuthService.login() — the schema's `select: false` on password_hash
  // keeps it out of every other query by default, so login is the one deliberate,
  // narrow place that opts back in.
  findByPhoneNumberWithPassword(phoneNumber: string): Promise<MediaTeamMemberDocument | null> {
    return this.mediaTeamMemberModel
      .findOne({ phone_number: phoneNumber })
      .select('+password_hash')
      .exec();
  }

  // Used only by AuthService.changePassword() — same select:false opt-in pattern as
  // findByPhoneNumberWithPassword(), narrowed to "the currently authenticated user's
  // own record" by the caller (never exposed as a way to fetch anyone else's hash).
  findByIdWithPassword(id: string): Promise<MediaTeamMemberDocument | null> {
    return this.mediaTeamMemberModel.findById(id).select('+password_hash').exec();
  }

  // Used only by AuthService.forgotPassword() to check whether an account exists for
  // the given phone number before generating/sending an OTP — deliberately returns
  // null rather than throwing, so the caller can respond identically either way and
  // never reveal whether a phone number has an account.
  findByPhoneNumber(phoneNumber: string): Promise<MediaTeamMemberDocument | null> {
    return this.mediaTeamMemberModel.findOne({ phone_number: phoneNumber }).exec();
  }

  // Used only by AuthService.resetPassword() — same select:false opt-in pattern as
  // findByPhoneNumberWithPassword(), scoped to the reset-OTP fields instead.
  findByPhoneNumberWithResetOtp(phoneNumber: string): Promise<MediaTeamMemberDocument | null> {
    return this.mediaTeamMemberModel
      .findOne({ phone_number: phoneNumber })
      .select('+reset_otp_hash +reset_otp_expires_at')
      .exec();
  }

  // The only path allowed to write reset_otp_hash/reset_otp_expires_at — see
  // AuthService.forgotPassword(). A fresh call always overwrites any prior unused OTP,
  // so only the most recently requested code is ever valid.
  async setResetOtp(id: string, otpHash: string, expiresAt: Date): Promise<void> {
    const result = await this.mediaTeamMemberModel
      .findByIdAndUpdate(id, { reset_otp_hash: otpHash, reset_otp_expires_at: expiresAt })
      .exec();
    if (!result) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
  }

  // Called once an OTP has been consumed (or superseded) — see
  // AuthService.resetPassword() — so a captured/guessed code is never replayable.
  async clearResetOtp(id: string): Promise<void> {
    const result = await this.mediaTeamMemberModel
      .findByIdAndUpdate(id, { $unset: { reset_otp_hash: 1, reset_otp_expires_at: 1 } })
      .exec();
    if (!result) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
  }

  async updatePassword(id: string, newPasswordHash: string): Promise<void> {
    const result = await this.mediaTeamMemberModel
      .findByIdAndUpdate(id, { password_hash: newPasswordHash })
      .exec();
    if (!result) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
  }

  async findOne(id: string): Promise<MediaTeamMemberDocument> {
    const member = await this.mediaTeamMemberModel.findById(id).exec();
    if (!member) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
    return member;
  }

  async update(id: string, dto: UpdateMediaTeamMemberDto): Promise<MediaTeamMemberDocument> {
    if (dto.phone_number) {
      const existing = await this.mediaTeamMemberModel
        .findOne({ phone_number: dto.phone_number, _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new ConflictException(
          `A media team member with phone number ${dto.phone_number} already exists (${existing.full_name})`,
        );
      }
    }

    let member: MediaTeamMemberDocument | null;
    try {
      member = await this.mediaTeamMemberModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, dto.phone_number);
    }
    if (!member) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
    return member;
  }

  async remove(id: string): Promise<void> {
    const result = await this.mediaTeamMemberModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Media team member ${id} not found`);
    }
  }

  private translateDuplicateKeyError(error: unknown, phoneNumber?: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        phoneNumber
          ? `A media team member with phone number ${phoneNumber} already exists`
          : 'A media team member with these details already exists',
      );
    }
    return error as Error;
  }
}
