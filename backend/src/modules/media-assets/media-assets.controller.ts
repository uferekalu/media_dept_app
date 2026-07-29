import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MediaAssetsService } from './media-assets.service';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto';
import { CreateMediaAssetLinkDto } from './dto/create-media-asset-link.dto';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto';
import { MediaAssetType } from '../../common/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

// Every route requires login, but no @Roles()/RolesGuard — per backend/CLAUDE.md,
// MediaAsset isn't in the ADMIN/DIRECTOR-elevated list; a MEMBER can create (and, by
// the same "shared team resource" reasoning, edit/delete) media assets same as anyone.
@ApiTags('media-assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media-assets')
export class MediaAssetsController {
  constructor(private readonly mediaAssetsService: MediaAssetsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(new BadRequestException('Only image files are allowed'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        type: { type: 'string', enum: [MediaAssetType.PHOTO, MediaAssetType.GRAPHIC, MediaAssetType.THUMBNAIL] },
        service: { type: 'string' },
        uploaded_by: { type: 'string' },
        tags: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a Photo/Graphic/Thumbnail (max 10MB image, real Cloudinary upload)' })
  @ApiBadRequestResponse({ description: 'Not an image type, or no file provided' })
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadMediaAssetDto) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.mediaAssetsService.uploadImage(file, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Add a Video Clip/Full Recording by pasted URL (no file upload)' })
  @ApiBadRequestResponse({ description: 'Not a video type' })
  createLink(@Body() dto: CreateMediaAssetLinkDto) {
    return this.mediaAssetsService.createLink(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List/search media assets, optionally filtered by service, type, or tag' })
  @ApiQuery({ name: 'service', required: false })
  @ApiQuery({ name: 'type', required: false, enum: MediaAssetType })
  @ApiQuery({ name: 'tag', required: false })
  findAll(
    @Query('service') service?: string,
    @Query('type') type?: MediaAssetType,
    @Query('tag') tag?: string,
  ) {
    return this.mediaAssetsService.findAll({ service, type, tag });
  }

  // Declared before ':id' — Nest matches routes in registration order, so a literal
  // segment must come first or it'd be swallowed as an :id param.
  @Get('full-recordings')
  @ApiOperation({ summary: 'List every Full Recording, most recent first — powers the VOD Archive' })
  findFullRecordings() {
    return this.mediaAssetsService.findFullRecordings();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single media asset' })
  @ApiNotFoundResponse({ description: 'Media asset not found' })
  findOne(@Param('id') id: string) {
    return this.mediaAssetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Re-tag or re-link a media asset to a different service' })
  @ApiNotFoundResponse({ description: 'Media asset not found' })
  update(@Param('id') id: string, @Body() dto: UpdateMediaAssetDto) {
    return this.mediaAssetsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media asset record' })
  @ApiNotFoundResponse({ description: 'Media asset not found' })
  remove(@Param('id') id: string) {
    return this.mediaAssetsService.remove(id);
  }
}
