import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MediaTeamMemberRole } from '../../../common/enums';

export type MediaTeamMemberDocument = HydratedDocument<MediaTeamMember>;

@Schema({ timestamps: true })
export class MediaTeamMember {
  @Prop({ required: true, trim: true })
  full_name: string;

  @Prop({ required: true, trim: true, unique: true })
  phone_number: string;

  @Prop({ required: true, enum: MediaTeamMemberRole, default: MediaTeamMemberRole.MEMBER })
  role: MediaTeamMemberRole;

  // e.g. Camera Operation, Audio, Streaming/Encoding, ProPresenter/Graphics,
  // Photography, Video Editing, Social Media — used when building crew assignments
  // (Phase 3), not a permission mechanism.
  @Prop({ type: [String], default: [] })
  skills: string[];

  // Populated from Phase 1 onward even though login itself is Phase 7, since
  // CrewAssignment (Phase 3) already references MediaTeamMember as the "user" record —
  // same reasoning as protocol_dept_app's ProtocolMember.password_hash. `select: false`
  // keeps it out of query results by default; the toJSON transform below is a second
  // layer so it can never leak in an API response even if a future auth query
  // explicitly selects it back in.
  @Prop({ required: true, select: false })
  password_hash: string;

  // Forgot-password OTP (AuthService.forgotPassword()/resetPassword()) — same
  // select:false + never-in-toJSON pattern as password_hash. Hashed, not stored raw, and
  // cleared (both fields) the moment it's used or superseded by a newer request, so a
  // captured value is never replayable.
  @Prop({ select: false })
  reset_otp_hash?: string;

  @Prop({ select: false })
  reset_otp_expires_at?: Date;
}

export const MediaTeamMemberSchema = SchemaFactory.createForClass(MediaTeamMember);

MediaTeamMemberSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: any) => {
    delete ret.password_hash;
    delete ret.reset_otp_hash;
    delete ret.reset_otp_expires_at;
    return ret;
  },
});
