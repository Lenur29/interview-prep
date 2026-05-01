import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { S3MultipartController } from './s3-multipart.controller.js';
import { S3MultipartService } from './s3-multipart.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [S3MultipartController],
  providers: [S3MultipartService],
  exports: [S3MultipartService],
})
export class S3MultipartModule {}
