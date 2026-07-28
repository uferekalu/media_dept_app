import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MediaAssetType } from '../../../common/enums';

export type MediaAssetDocument = HydratedDocument<MediaAsset>;

@Schema({ timestamps: { createdAt: 'uploaded_at', updatedAt: true } })
export class MediaAsset {
  // Optional — brief Section 2: "some assets, like a generic graphic template, aren't
  // tied to one service."
  @Prop({ type: Types.ObjectId, ref: 'Service', index: true })
  service?: Types.ObjectId;

  @Prop({ required: true, enum: MediaAssetType })
  type: MediaAssetType;

  // A real Cloudinary secure_url for PHOTO/GRAPHIC/THUMBNAIL (set by
  // MediaAssetsService.uploadImage()); a pasted URL (e.g. the YouTube link) for
  // VIDEO_CLIP/FULL_RECORDING (set by MediaAssetsService.createLink()). Never edited
  // after creation — see UpdateMediaAssetDto.
  @Prop({ required: true, trim: true })
  storage_url: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Types.ObjectId, ref: 'MediaTeamMember', required: true, index: true })
  uploaded_by: Types.ObjectId;
}

export const MediaAssetSchema = SchemaFactory.createForClass(MediaAsset);
