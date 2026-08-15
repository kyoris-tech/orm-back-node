import { IsNotEmpty, IsString } from 'class-validator';

export class LinkJobOpeningDto {
  @IsString()
  @IsNotEmpty()
  jobOpeningId: string;
}
