import { UseGuards } from '@nestjs/common';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { ActionContextParam } from '@/context/action-context.decorator.js';
import { type ActionContext } from '@/context/action-context.js';
import { GraphQLAuthGuard } from '@/guards/auth.guard.js';
import { GraphQLPermissionsGuard } from '@/guards/permissions.guard.js';
import { isS3FileLocation } from '@/types/locations.js';

import { InjectLoggerFactory } from '@/modules/logger/logger.providers.js';
import { Logger } from '@/modules/logger/classes/logger.js';
import { LoggerFactory } from '@/modules/logger/classes/logger-factory.js';
import { S3MultipartService } from '@/modules/s3-multipart/s3-multipart.service.js';

import { BinaryFile } from './binary-file.entity.js';
import { BinaryFilesService } from './binary-files.service.js';
import { CreateBinaryFileInput } from './types/resolver/index.js';
import { UsePermission } from '@/permissions/use-permission.decorator.js';

const SIGNED_URL_TTL = 60 * 60; // 1 hour

@Resolver(() => BinaryFile)
@UseGuards(GraphQLAuthGuard, GraphQLPermissionsGuard)
export class BinaryFilesResolver {
  private logger!: Logger;

  constructor(
    @InjectLoggerFactory() protected readonly loggerFactory: LoggerFactory,
    protected readonly binaryFilesService: BinaryFilesService,
    protected readonly s3MultipartService: S3MultipartService,
  ) {
    this.logger = this.loggerFactory.create({
      scope: this.constructor.name,
    });
  }

  @Query(() => BinaryFile)
  @UsePermission('lm:binary-files:get')
  async binaryFile(
    @Args('id') id: string,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<BinaryFile> {
    return await this.binaryFilesService.getOneOrFail(id, ctx);
  }

  @Query(() => [BinaryFile])
  @UsePermission('lm:binary-files:get')
  async binaryFilesByIds(
    @Args('ids', { type: () => [String] }) ids: string[],
  ): Promise<BinaryFile[]> {
    return await this.binaryFilesService.getManyByIds(ids);
  }

  @Mutation(() => BinaryFile)
  @UsePermission('lm:binary-files:create')
  async createBinaryFile(
    @Args('input') input: CreateBinaryFileInput,
    @ActionContextParam() ctx: ActionContext,
  ): Promise<BinaryFile> {
    return await this.binaryFilesService.create(input, ctx);
  }

  /**
   * Public files: direct S3/CDN URL.
   * Private files: short-lived presigned GET URL (readable inline, e.g. <img>).
   */
  @ResolveField(() => String, { nullable: true })
  async url(@Parent() file: BinaryFile): Promise<string | null> {
    if (!file.isPrivate || !isS3FileLocation(file.location)) {
      return file.url;
    }

    return await this.s3MultipartService.getPresignedDownloadUrl({
      bucket: file.location.bucket,
      key: file.location.path,
      expiresIn: SIGNED_URL_TTL,
      responseContentType: file.meta.mimeType ?? undefined,
    });
  }

  /**
   * Presigned URL with Content-Disposition: attachment and original filename —
   * suitable for "Download" buttons. Works for both public and private files.
   */
  @ResolveField(() => String, { nullable: true })
  async downloadUrl(@Parent() file: BinaryFile): Promise<string | null> {
    if (!isS3FileLocation(file.location)) {
      return file.url;
    }

    return await this.s3MultipartService.getPresignedDownloadUrl({
      bucket: file.location.bucket,
      key: file.location.path,
      expiresIn: SIGNED_URL_TTL,
      responseContentDisposition: buildAttachmentContentDisposition(file.meta.name),
      responseContentType: file.meta.mimeType ?? undefined,
    });
  }
}

/**
 * RFC 6266 / RFC 5987: provide a plain ASCII `filename=...` fallback
 * alongside a percent-encoded UTF-8 `filename*=` for international names.
 */
function buildAttachmentContentDisposition(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return 'attachment';
  }

  const asciiFallback = trimmed.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(trimmed);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
