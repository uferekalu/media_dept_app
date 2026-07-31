import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContributionCampaign,
  ContributionCampaignDocument,
} from './schemas/contribution-campaign.schema';
import { CreateContributionCampaignDto } from './dto/create-contribution-campaign.dto';
import { UpdateContributionCampaignDto } from './dto/update-contribution-campaign.dto';
import { UpdateContributionCampaignStatusDto } from './dto/update-contribution-campaign-status.dto';
import { EquipmentService } from '../equipment/equipment.service';
import {
  ContributionCampaignStatus,
  VALID_CONTRIBUTION_CAMPAIGN_STATUS_TRANSITIONS,
} from '../../common/enums';

@Injectable()
export class ContributionCampaignsService {
  constructor(
    @InjectModel(ContributionCampaign.name)
    private contributionCampaignModel: Model<ContributionCampaignDocument>,
    private readonly equipmentService: EquipmentService,
  ) {}

  // created_by is passed in separately (derived from the JWT in the controller), never
  // taken from the DTO — see the brief's Section 4I identity-attribution rule.
  async create(
    dto: CreateContributionCampaignDto,
    createdBy: string,
  ): Promise<ContributionCampaignDocument> {
    if (dto.equipment) {
      await this.equipmentService.findOne(dto.equipment);
    }

    return this.contributionCampaignModel.create({ ...dto, created_by: createdBy });
  }

  findAll(filters: { status?: ContributionCampaignStatus }): Promise<ContributionCampaignDocument[]> {
    const query: Record<string, string> = {};
    if (filters.status) query.status = filters.status;
    return this.contributionCampaignModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ContributionCampaignDocument> {
    const campaign = await this.contributionCampaignModel.findById(id).exec();
    if (!campaign) {
      throw new NotFoundException(`Contribution campaign ${id} not found`);
    }
    return campaign;
  }

  async update(
    id: string,
    dto: UpdateContributionCampaignDto,
  ): Promise<ContributionCampaignDocument> {
    if (dto.equipment) {
      await this.equipmentService.findOne(dto.equipment);
    }

    const campaign = await this.findOne(id);

    if (dto.target_amount !== undefined && dto.target_amount < campaign.current_amount) {
      throw new BadRequestException(
        `target_amount (${dto.target_amount}) cannot be less than the ${campaign.current_amount} already raised.`,
      );
    }

    Object.assign(campaign, dto);
    await campaign.save();
    return campaign;
  }

  async updateStatus(
    id: string,
    dto: UpdateContributionCampaignStatusDto,
  ): Promise<ContributionCampaignDocument> {
    const campaign = await this.findOne(id);

    const allowedNextStatuses = VALID_CONTRIBUTION_CAMPAIGN_STATUS_TRANSITIONS[campaign.status];
    if (!allowedNextStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move a contribution campaign from ${campaign.status} to ${dto.status}. Valid next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(', ') : 'none — this campaign is closed'
        }`,
      );
    }

    campaign.status = dto.status;
    await campaign.save();
    return campaign;
  }

  // Never delete a campaign that already has real money raised against it — Closing it
  // (via updateStatus) is the correct way to stop a funded campaign; deleting would
  // orphan the audit trail of Contribution records referencing it.
  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    if (campaign.current_amount > 0) {
      throw new BadRequestException(
        `This campaign has already raised ${campaign.current_amount} kobo — close it instead of deleting it.`,
      );
    }
    await this.contributionCampaignModel.findByIdAndDelete(id).exec();
  }

  // Internal, system-driven write used by ContributionsService.verifyAndSync() the
  // moment a Contribution is confirmed SUCCESSFUL — never exposed via its own endpoint,
  // same convention as EquipmentService.setCurrentStatus(). $inc is atomic in MongoDB,
  // so concurrent successful contributions never lose an update to each other.
  async incrementRaised(id: string, amountKobo: number): Promise<void> {
    const campaign = await this.contributionCampaignModel
      .findByIdAndUpdate(id, { $inc: { current_amount: amountKobo } }, { new: true })
      .exec();

    if (
      campaign &&
      campaign.status === ContributionCampaignStatus.ACTIVE &&
      campaign.current_amount >= campaign.target_amount
    ) {
      campaign.status = ContributionCampaignStatus.COMPLETED;
      await campaign.save();
    }
  }
}
