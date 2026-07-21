import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
