import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { RestActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { AuthGuard } from '@/guards/auth.guard.js';
import { PermissionsGuard } from '@/guards/permissions.guard.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

import { isValidS3Key } from './s3-key.utils.js';
import { S3MultipartService } from './s3-multipart.service.js';
import { CompleteMultipartUploadBody } from './types/controller/complete-multipart-upload.body.js';
import { CreateMultipartUploadBody } from './types/controller/create-multipart-upload.body.js';
import { SignUploadBody } from './types/controller/sign-upload.body.js';

@Controller('s3')
@UseGuards(AuthGuard, PermissionsGuard)
export class S3MultipartController {
  constructor(private readonly s3MultipartService: S3MultipartService) {}

  @Get('sts')
  @UsePermission('lm:binary-files:create')
  async getSTSCredentials(@RestActionContextParam() ctx: ActionContext) {
    return this.s3MultipartService.getSTSCredentials(ctx);
  }

  @Get('params')
  @UsePermission('lm:binary-files:create')
  async getSignedUploadUrlViaGet(@Query() query: Record<string, string>) {
    const { filename, type } = query;

    if (!filename || !type) {
      throw new BadRequestException(
        'Missing required parameters: filename and content type are required',
      );
    }

    // Uppy sends metadata[private]=true as a flat query param
    const isPrivate = query['metadata[private]'] === 'true';

    return this.s3MultipartService.getSignedUploadUrl({
      filename,
      contentType: type,
      private: isPrivate,
    });
  }

  @Post('sign')
  @UsePermission('lm:binary-files:create')
  async getSignedUploadUrlViaPost(@Body() body: SignUploadBody) {
    const { filename, type } = body;

    if (!filename || !type) {
      throw new BadRequestException(
        'Missing required parameters: filename and content type are required',
      );
    }

    const isPrivate = body.metadata?.private;

    return this.s3MultipartService.getSignedUploadUrl({
      filename,
      contentType: type,
      private: isPrivate,
    });
  }

  @Post('multipart')
  @UsePermission('lm:binary-files:create')
  async createMultipartUpload(@Body() body: CreateMultipartUploadBody) {
    const { filename, type, metadata } = body;

    if (typeof filename !== 'string') {
      throw new BadRequestException('s3: content filename must be a string');
    }

    if (typeof type !== 'string') {
      throw new BadRequestException('s3: content type must be a string');
    }

    return this.s3MultipartService.createMultipartUpload({
      filename,
      contentType: type,
      metadata,
      private: body.private,
    });
  }

  @Get('multipart/:uploadId/:partNumber')
  @UsePermission('lm:binary-files:create')
  async getSignedPartUrl(
    @Param('uploadId') uploadId: string,
    @Param('partNumber') partNumber: string,
    @Query('key') key: string,
  ) {
    const partNum = Number(partNumber);

    if (!this.s3MultipartService.validatePartNumber(partNum)) {
      throw new BadRequestException(
        's3: the part number must be an integer between 1 and 10000.',
      );
    }

    if (typeof key !== 'string') {
      throw new BadRequestException(
        's3: the object key must be passed as a query parameter. For example: "?key=abc.jpg"',
      );
    }

    if (!isValidS3Key(key)) {
      throw new BadRequestException('s3: invalid object key');
    }

    return this.s3MultipartService.getSignedPartUrl({
      uploadId,
      partNumber: partNum,
      key,
    });
  }

  @Get('multipart/:uploadId')
  @UsePermission('lm:binary-files:create')
  async listParts(
    @Param('uploadId') uploadId: string,
    @Query('key') key: string,
  ) {
    if (typeof key !== 'string') {
      throw new BadRequestException(
        's3: the object key must be passed as a query parameter. For example: "?key=abc.jpg"',
      );
    }

    if (!isValidS3Key(key)) {
      throw new BadRequestException('s3: invalid object key');
    }

    return this.s3MultipartService.listParts({
      uploadId,
      key,
    });
  }

  @Post('multipart/:uploadId/complete')
  @UsePermission('lm:binary-files:create')
  async completeMultipartUpload(
    @Param('uploadId') uploadId: string,
    @Query('key') key: string,
    @Body() body: CompleteMultipartUploadBody,
  ) {
    if (typeof key !== 'string') {
      throw new BadRequestException(
        's3: the object key must be passed as a query parameter. For example: "?key=abc.jpg"',
      );
    }

    if (!isValidS3Key(key)) {
      throw new BadRequestException('s3: invalid object key');
    }

    const { parts } = body;

    if (!Array.isArray(parts)) {
      throw new BadRequestException(
        's3: `parts` must be an array of {ETag, PartNumber} objects.',
      );
    }

    return this.s3MultipartService.completeMultipartUpload({
      uploadId,
      key,
      parts,
    });
  }

  @Delete('multipart/:uploadId')
  @UsePermission('lm:binary-files:create')
  async abortMultipartUpload(
    @Param('uploadId') uploadId: string,
    @Query('key') key: string,
  ) {
    if (typeof key !== 'string') {
      throw new BadRequestException(
        's3: the object key must be passed as a query parameter. For example: "?key=abc.jpg"',
      );
    }

    if (!isValidS3Key(key)) {
      throw new BadRequestException('s3: invalid object key');
    }

    return this.s3MultipartService.abortMultipartUpload({
      uploadId,
      key,
    });
  }
}
