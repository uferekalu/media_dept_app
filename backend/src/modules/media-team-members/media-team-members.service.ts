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
