import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateBoardColumnDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isDoneColumn?: boolean;
}
