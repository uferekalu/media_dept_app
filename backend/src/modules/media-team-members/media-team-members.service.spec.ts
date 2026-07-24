import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MediaTeamMembersService } from './media-team-members.service';
import { MediaTeamMember } from './schemas/media-team-member.schema';
import { MediaTeamMemberRole } from '../../common/enums';

describe('MediaTeamMembersService', () => {
  let service: MediaTeamMembersService;
  let model: {
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MediaTeamMembersService,
        { provide: getModelToken(MediaTeamMember.name), useValue: model },
      ],
    }).compile();

    service = moduleRef.get(MediaTeamMembersService);
  });

  describe('create', () => {
    it('rejects a duplicate phone number', async () => {
      model.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ full_name: 'Existing Member' }),
      });

      await expect(
        service.create({
          full_name: 'New Member',
          phone_number: '+2348011112222',
          role: MediaTeamMemberRole.MEMBER,
          password: 'A-strong-p4ssword!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(model.create).not.toHaveBeenCalled();
    });

    it('hashes the password and never persists the plaintext field', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      model.create.mockResolvedValue({ full_name: 'New Member' });

      await service.create({
        full_name: 'New Member',
        phone_number: '+2348011112222',
        role: MediaTeamMemberRole.MEMBER,
        password: 'A-strong-p4ssword!',
      });

      expect(model.create).toHaveBeenCalledTimes(1);
      const persisted = model.create.mock.calls[0][0];
      expect(persisted.password).toBeUndefined();
      expect(persisted.password_hash).toEqual(expect.any(String));
      expect(persisted.password_hash).not.toEqual('A-strong-p4ssword!');
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when no member matches the id', async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
