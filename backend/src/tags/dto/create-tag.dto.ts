import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color phải là mã hex, VD: #4C8DFF' })
  color?: string;
}
