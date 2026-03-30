import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}
