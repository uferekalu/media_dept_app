import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CrewAssignmentRole, CrewAssignmentStatus } from '../../../common/enums';

export type CrewAssignmentDocument = HydratedDocument<CrewAssignment>;

@Schema({ timestamps: true })
export class CrewAssignment {
  @Prop({ type: Types.ObjectId, ref: 'Service', required: true, index: true })
  service: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MediaTeamMember', required: true, index: true })
  media_team_member: Types.ObjectId;

  @Prop({ required: true, enum: CrewAssignmentRole })
  role: CrewAssignmentRole;

  @Prop({ required: true })
  call_time: Date;

  @Prop({ required: true, enum: CrewAssignmentStatus, default: CrewAssignmentStatus.PENDING })
  status: CrewAssignmentStatus;

  @Prop({ trim: true })
  notes?: string;
}

export const CrewAssignmentSchema = SchemaFactory.createForClass(CrewAssignment);

// One role slot per service — a second Camera 1 for the same service is a reassignment
// (PATCH the existing document's media_team_member), not a new document. Mirrors
// protocol_dept_app's defense-in-depth pattern: the pre-check in the service catches
// this in the common case, this index is the real guarantee under a race.
CrewAssignmentSchema.index({ service: 1, role: 1 }, { unique: true });
