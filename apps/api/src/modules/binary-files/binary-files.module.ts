import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { S3MultipartModule } from '@/modules/s3-multipart/s3-multipart.module.js';

import { BinaryFile } from './binary-file.entity.js';
import { BinaryFilesResolver } from './binary-files.resolver.js';
import { BinaryFilesService } from './binary-files.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([BinaryFile]),
    S3MultipartModule,
  ],
  providers: [
    BinaryFilesService,
    BinaryFilesResolver,
  ],
  exports: [
    BinaryFilesService,
  ],
})
export class BinaryFilesModule {}
