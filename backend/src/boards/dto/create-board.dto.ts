import { IsString, Matches, MinLength } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, {
    message: 'keyPrefix chỉ gồm chữ hoa/số, tối đa 10 ký tự',
  })
  keyPrefix!: string;
}
