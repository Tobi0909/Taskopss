import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBoardColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isDoneColumn?: boolean;
}
