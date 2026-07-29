import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CrewAssignment, CrewAssignmentDocument } from './schemas/crew-assignment.schema';
import { CreateCrewAssignmentDto } from './dto/create-crew-assignment.dto';
import { UpdateCrewAssignmentDto } from './dto/update-crew-assignment.dto';
import { UpdateCrewAssignmentStatusDto } from './dto/update-crew-assignment-status.dto';
import { ServicesService } from '../services/services.service';
import { MediaTeamMembersService } from '../media-team-members/media-team-members.service';
import { TermiiService } from '../../common/termii/termii.service';
import { CREW_ASSIGNMENT_ROLE_LABELS, VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS } from '../../common/enums';

const MONGO_DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class CrewAssignmentsService {
  constructor(
    @InjectModel(CrewAssignment.name) private crewAssignmentModel: Model<CrewAssignmentDocument>,
    private readonly servicesService: ServicesService,
    private readonly mediaTeamMembersService: MediaTeamMembersService,
    private readonly termiiService: TermiiService,
  ) {}

  async create(dto: CreateCrewAssignmentDto): Promise<CrewAssignmentDocument> {
    // Referential integrity: a bad id 404s here instead of silently creating a
    // dangling reference.
    const service = await this.servicesService.findOne(dto.service);
    await this.mediaTeamMembersService.findOne(dto.media_team_member);

    const existing = await this.crewAssignmentModel
      .findOne({ service: dto.service, role: dto.role })
      .exec();
    if (existing) {
      throw new ConflictException(
        `A ${dto.role} crew assignment already exists for this service`,
      );
    }

    let assignment: CrewAssignmentDocument;
    try {
      assignment = await this.crewAssignmentModel.create(dto);
    } catch (error) {
      throw this.translateDuplicateKeyError(error, dto.role);
    }

    // Best-effort — see notifyAssignment()'s comment. A notification failure must
    // never fail assignment creation itself.
    try {
      await this.notifyAssignment(assignment, service.name);
    } catch {
      // swallowed deliberately
    }

    return assignment;
  }

  // TermiiService.sendSms() already never throws on a delivery failure — this method's
  // own try/catch at the call site above is defense in depth for the lookup here
  // (media team member), which in practice can't fail since the id was just validated a
  // few lines up in create(), but a notification is never worth risking the assignment
  // itself over. Mirrors protocol_dept_app's AssignmentsService.notifyAssignment().
  private async notifyAssignment(
    assignment: CrewAssignmentDocument,
    serviceName: string,
  ): Promise<void> {
    const member = await this.mediaTeamMembersService.findOne(
      assignment.media_team_member.toString(),
    );

    const label = CREW_ASSIGNMENT_ROLE_LABELS[assignment.role];
    const when = new Date(assignment.call_time).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const message = `Hi ${member.full_name}, you've been assigned: ${label} for ${serviceName} — call time ${when}. Check the Media Department app for details.`;

    await this.termiiService.sendSms(member.phone_number, message);
  }

  findAll(): Promise<CrewAssignmentDocument[]> {
    return this.crewAssignmentModel.find().sort({ call_time: 1 }).exec();
  }

  // Powers the Crew Assignment Board (brief Section 5).
  findByService(serviceId: string): Promise<CrewAssignmentDocument[]> {
    return this.crewAssignmentModel.find({ service: serviceId }).sort({ call_time: 1 }).exec();
  }

  // Powers "My Assignments" (brief Section 5 / backend/CLAUDE.md).
  async findByMediaTeamMember(mediaTeamMemberId: string): Promise<CrewAssignmentDocument[]> {
    await this.mediaTeamMembersService.findOne(mediaTeamMemberId);
    return this.crewAssignmentModel
      .find({ media_team_member: mediaTeamMemberId })
      .sort({ call_time: 1 })
      .exec();
  }

  async findOne(id: string): Promise<CrewAssignmentDocument> {
    const assignment = await this.crewAssignmentModel.findById(id).exec();
    if (!assignment) {
      throw new NotFoundException(`Crew assignment ${id} not found`);
    }
    return assignment;
  }

  async update(id: string, dto: UpdateCrewAssignmentDto): Promise<CrewAssignmentDocument> {
    const existing = await this.findOne(id);

    if (dto.service) {
      await this.servicesService.findOne(dto.service);
    }
    if (dto.media_team_member) {
      await this.mediaTeamMembersService.findOne(dto.media_team_member);
    }

    const effectiveService = dto.service ?? existing.service.toString();
    const effectiveRole = dto.role ?? existing.role;
    if (dto.service || dto.role) {
      const conflict = await this.crewAssignmentModel
        .findOne({ _id: { $ne: id }, service: effectiveService, role: effectiveRole })
        .exec();
      if (conflict) {
        throw new ConflictException(
          `A ${effectiveRole} crew assignment already exists for this service`,
        );
      }
    }

    let assignment: CrewAssignmentDocument | null;
    try {
      assignment = await this.crewAssignmentModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    } catch (error) {
      throw this.translateDuplicateKeyError(error, effectiveRole);
    }
    if (!assignment) {
      throw new NotFoundException(`Crew assignment ${id} not found`);
    }
    return assignment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.crewAssignmentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Crew assignment ${id} not found`);
    }
  }

  // The guarded status-transition endpoint — mirrors ServicesService.updateStatus().
  async updateStatus(
    id: string,
    dto: UpdateCrewAssignmentStatusDto,
  ): Promise<CrewAssignmentDocument> {
    const assignment = await this.findOne(id);

    const allowedNextStatuses = VALID_CREW_ASSIGNMENT_STATUS_TRANSITIONS[assignment.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a crew assignment from ${assignment.status} to ${dto.status}. Valid next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none — this assignment is already completed'
        }`,
      );
    }

    assignment.status = dto.status;
    if (dto.notes !== undefined) {
      assignment.notes = dto.notes;
    }
    await assignment.save();
    return assignment;
  }

  private translateDuplicateKeyError(error: unknown, role?: string): Error {
    const isDuplicateKeyError =
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === MONGO_DUPLICATE_KEY_ERROR;

    if (isDuplicateKeyError) {
      return new ConflictException(
        role
          ? `A ${role} crew assignment already exists for this service`
          : 'A crew assignment with these details already exists',
      );
    }
    return error as Error;
  }
}
