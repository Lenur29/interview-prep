import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

class SignUploadMetadata {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  private?: boolean;
}

export class SignUploadBody {
  @IsString()
  filename!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignUploadMetadata)
  metadata?: SignUploadMetadata;
}
