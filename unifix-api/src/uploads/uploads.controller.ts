import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  @Post('evidence')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a photo as evidence for a service request' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('Only JPG or PNG images are allowed'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const baseUrl = `${request.protocol}://${request.get('host')}`;
    return { url: `${baseUrl}/uploads/${file.filename}` };
  }
}
