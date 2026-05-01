import {
  IsBoolean, IsObject, IsOptional, IsString,
} from 'class-validator';

export class CreateMultipartUploadBody {
  @IsString()
  filename!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  private?: boolean;
}
