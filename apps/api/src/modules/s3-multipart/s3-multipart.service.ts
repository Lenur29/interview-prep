import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { GetFederationTokenCommand, STSClient } from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { S3Config } from '@/config/index.js';
import { ServiceMethodContext } from '@/context/service-method-context.js';
import { S3Provider } from '@/types/s3.js';

import { sanitizeS3Key } from './s3-key.utils.js';

const EXPIRES_IN = 900; // 15 minutes

export interface CreateMultipartUploadOptions {
  filename: string;
  contentType: string;
  metadata?: Record<string, string>;
  private?: boolean;
}

export interface GetSignedUploadUrlOptions {
  filename: string;
  contentType: string;
  private?: boolean;
}

export interface GetSignedPartUrlOptions {
  uploadId: string;
  partNumber: number;
  key: string;
}

export interface ListPartsOptions {
  uploadId: string;
  key: string;
}

export interface CompleteMultipartUploadOptions {
  uploadId: string;
  key: string;
  parts: { ETag: string; PartNumber: number }[];
}

export interface AbortMultipartUploadOptions {
  uploadId: string;
  key: string;
}

@Injectable()
export class S3MultipartService {
  private s3Client: S3Client;
  private stsClient: STSClient;
  private readonly bucket: string;
  private readonly privateBucket: string;
  private readonly region: string;
  private readonly provider: S3Provider;
  private readonly endpoint?: string;
  private activeMultipartUploads = new Map<string, string>();

  constructor(
    @Inject(S3Config.KEY)
    readonly s3Config: ConfigType<typeof S3Config>,
  ) {
    this.region = s3Config.region;
    this.bucket = s3Config.bucket;
    this.privateBucket = s3Config.privateBucket;
    this.provider = s3Config.provider;
    this.endpoint = s3Config.endpoint;

    const s3ClientConfig: S3ClientConfig = {
      region: this.region,
      forcePathStyle: s3Config.forcePathStyle,
    };

    if (s3Config.accessKeyId && s3Config.secretAccessKey) {
      s3ClientConfig.credentials = {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      };
    }

    if (this.endpoint) {
      s3ClientConfig.endpoint = this.endpoint;
    }

    this.s3Client = new S3Client(s3ClientConfig);

    this.stsClient = new STSClient({
      region: this.region,
      ...(s3Config.accessKeyId && s3Config.secretAccessKey && {
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
        },
      }),
    });
  }

  private generateS3Key(filename: string): string {
    return sanitizeS3Key(filename);
  }

  private getBucket(isPrivate?: boolean): string {
    return isPrivate ? this.privateBucket : this.bucket;
  }

  /**
   * Generates the public base URL for the S3 bucket based on the provider.
   * AWS: https://bucket.s3.region.amazonaws.com
   * DigitalOcean: https://bucket.region.digitaloceanspaces.com
   * GCS: https://storage.googleapis.com/bucket (path-style)
   * MinIO (custom endpoint): http://endpoint/bucket
   */
  private getPublicBaseUrl(bucket: string): string {
    if (this.provider === S3Provider.MINIO) {
      return `${this.endpoint}/${bucket}`;
    }
    if (this.provider === S3Provider.DIGITALOCEAN) {
      return `https://${bucket}.${this.region}.digitaloceanspaces.com`;
    }
    if (this.provider === S3Provider.GCS) {
      return `https://storage.googleapis.com/${bucket}`;
    }

    return `https://${bucket}.s3.${this.region}.amazonaws.com`;
  }

  private getPolicy() {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject'],
          Resource: [
            `arn:aws:s3:::${this.bucket}/*`,
            `arn:aws:s3:::${this.bucket}`,
          ],
        },
      ],
    };
  }

  async getSTSCredentials(ctx: ServiceMethodContext) {
    const command = new GetFederationTokenCommand({
      Name: ctx.user.id,
      DurationSeconds: EXPIRES_IN,
      Policy: JSON.stringify(this.getPolicy()),
    });

    const response = await this.stsClient.send(command);

    return {
      credentials: response.Credentials,
      bucket: this.bucket,
      region: this.region,
    };
  }

  async getSignedUploadUrl(opts: GetSignedUploadUrlOptions) {
    const bucket = this.getBucket(opts.private);
    const Key = this.generateS3Key(opts.filename);

    const isDigitalOcean = this.provider === S3Provider.DIGITALOCEAN;
    const shouldSetPublicAcl = isDigitalOcean && !opts.private;

    const url = await getSignedUrl(
      this.s3Client,
      new PutObjectCommand({
        Bucket: bucket,
        Key,
        ContentType: opts.contentType,
        ...(shouldSetPublicAcl && { ACL: 'public-read' }),
      }),
      {
        expiresIn: EXPIRES_IN,
      },
    );

    return {
      url,
      method: 'PUT',
      headers: shouldSetPublicAcl ? { 'x-amz-acl': 'public-read' } : {},
    };
  }

  async createMultipartUpload(opts: CreateMultipartUploadOptions) {
    const bucket = this.getBucket(opts.private);
    const Key = this.generateS3Key(opts.filename);

    const isDigitalOcean = this.provider === S3Provider.DIGITALOCEAN;
    const shouldSetPublicAcl = isDigitalOcean && !opts.private;

    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
      ...(shouldSetPublicAcl && { ACL: 'public-read' }),
    });

    const data = await this.s3Client.send(command);

    if (data.UploadId) {
      this.activeMultipartUploads.set(data.UploadId, bucket);
    }

    return {
      key: data.Key,
      uploadId: data.UploadId,
    };
  }

  validatePartNumber(partNumber: number): boolean {
    return Number.isInteger(partNumber) && partNumber >= 1 && partNumber <= 10_000;
  }

  async getSignedPartUrl(opts: GetSignedPartUrlOptions) {
    const bucket = this.activeMultipartUploads.get(opts.uploadId);

    if (!bucket) {
      throw new NotFoundException(`Multipart upload not found: ${opts.uploadId}`);
    }

    const url = await getSignedUrl(
      this.s3Client,
      new UploadPartCommand({
        Bucket: bucket,
        Key: opts.key,
        UploadId: opts.uploadId,
        PartNumber: opts.partNumber,
        Body: '',
      }),
      {
        expiresIn: EXPIRES_IN,
      },
    );

    return {
      url,
      expires: EXPIRES_IN,
    };
  }

  async listParts(opts: ListPartsOptions) {
    const bucket = this.activeMultipartUploads.get(opts.uploadId);
    if (!bucket) {
      throw new NotFoundException(`Multipart upload not found: ${opts.uploadId}`);
    }

    const parts = [];
    let startsAt: string | undefined;

    do {
      const command = new ListPartsCommand({
        Bucket: bucket,
        Key: opts.key,
        UploadId: opts.uploadId,
        PartNumberMarker: startsAt,
      });

      const data = await this.s3Client.send(command);

      if (data.Parts) {
        parts.push(...data.Parts);
      }

      startsAt = data.IsTruncated ? data.NextPartNumberMarker : undefined;
    } while (startsAt !== undefined);

    return parts;
  }

  async completeMultipartUpload(opts: CompleteMultipartUploadOptions) {
    const bucket = this.activeMultipartUploads.get(opts.uploadId);
    if (!bucket) {
      throw new NotFoundException(`Multipart upload not found: ${opts.uploadId}`);
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: opts.key,
      UploadId: opts.uploadId,
      MultipartUpload: {
        Parts: opts.parts,
      },
    });

    await this.s3Client.send(command);

    const publicUrl = `${this.getPublicBaseUrl(bucket)}/${opts.key}`;

    this.activeMultipartUploads.delete(opts.uploadId);

    return {
      location: publicUrl,
    };
  }

  /**
   * Constructs the public URL for an object without calling the S3 API.
   */
  getPublicUrl(key: string, isPrivate?: boolean): string {
    const bucket = this.getBucket(isPrivate);

    return `${this.getPublicBaseUrl(bucket)}/${key}`;
  }

  async getPresignedDownloadUrl(opts: {
    bucket: string;
    key: string;
    expiresIn?: number;
    responseContentDisposition?: string;
    responseContentType?: string;
  }): Promise<string> {
    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: opts.bucket,
        Key: opts.key,
        ResponseContentDisposition: opts.responseContentDisposition,
        ResponseContentType: opts.responseContentType,
      }),
      {
        expiresIn: opts.expiresIn ?? EXPIRES_IN,
      },
    );
  }

  async abortMultipartUpload(opts: AbortMultipartUploadOptions) {
    const bucket = this.activeMultipartUploads.get(opts.uploadId);
    if (!bucket) {
      throw new NotFoundException(`Multipart upload not found: ${opts.uploadId}`);
    }

    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: opts.key,
      UploadId: opts.uploadId,
    });

    await this.s3Client.send(command);

    this.activeMultipartUploads.delete(opts.uploadId);

    return {};
  }
}
