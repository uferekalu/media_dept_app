import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StatusLog, StatusLogDocument } from './schemas/status-log.schema';
import { CreateStatusLogDto } from './dto/create-status-log.dto';
import { StatusLogEntityType } from '../../common/enums';

@Injectable()
export class StatusLogsService {
  constructor(
    @InjectModel(StatusLog.name) private statusLogModel: Model<StatusLogDocument>,
  ) {}

  // The only write path onto this append-only collection — no update/delete are
  // exposed anywhere, by design. Used directly here for Phase 1 testing/seeding, and
  // will be called from ServicesService.updateStatus() once Phase 2 builds the guarded
  // transition endpoint.
  create(dto: CreateStatusLogDto): Promise<StatusLogDocument> {
    return this.statusLogModel.create(dto);
  }

  findForEntity(
    entityType: StatusLogEntityType,
    entityId: string,
  ): Promise<StatusLogDocument[]> {
    return this.statusLogModel
      .find({ entity_type: entityType, entity_id: entityId })
      .sort({ timestamp: -1 })
      .exec();
  }
}
