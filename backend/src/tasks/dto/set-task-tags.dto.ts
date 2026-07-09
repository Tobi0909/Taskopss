import { IsArray, IsUUID } from 'class-validator';

export class SetTaskTagsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
