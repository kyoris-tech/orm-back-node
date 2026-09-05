import { IsString } from 'class-validator';

export class LinkCandidateToJobOpeningDto {
  @IsString()
  resumeId!: string;

  @IsString()
  jobOpeningId!: string;
}
