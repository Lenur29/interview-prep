import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested,
} from 'class-validator';

export class PartInfo {
  @IsString()
  ETag!: string;

  @IsNumber()
  PartNumber!: number;
}

export class CompleteMultipartUploadBody {
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => PartInfo)
  parts!: PartInfo[];

  @IsOptional()
  @IsBoolean()
  private?: boolean;
}
