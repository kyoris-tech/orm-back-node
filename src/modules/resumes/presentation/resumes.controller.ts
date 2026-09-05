import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { ResumesService } from '../application/resumes.service';
import { UploadService } from '../application/upload.service';
import { ResumePdfService } from '../infrastructure/pdf/resume-pdf.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { SearchResumeDto } from './dto/search-resume.dto';

@Controller('resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(
    private readonly resumesService: ResumesService,
    private readonly uploadService: UploadService,
    private readonly resumePdfService: ResumePdfService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.uploadService.upload(file, currentUser);
  }

  @Post('upload/bulk')
  @UseInterceptors(FilesInterceptor('files'))
  uploadBulk(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.uploadService.uploadBulk(files, currentUser);
  }

  @Post('upload/bulk/start')
  @UseInterceptors(FilesInterceptor('files'))
  startBulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.uploadService.startBulkUpload(files, currentUser);
  }

  @Get('upload/bulk/status/:jobId')
  getBulkStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.uploadService.getBulkStatus(jobId, currentUser);
  }

  @Post()
  create(
    @Body() dto: CreateResumeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.resumesService.create(dto, currentUser);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: SearchResumeDto,
  ) {
    return this.resumesService.findAllWithCompatibility(currentUser, query);
  }

  @Get('recent')
  async getRecentResumes(@CurrentUser() currentUser: AuthenticatedUser) {
    return {
      resumes: await this.resumesService.getRecentResumes(
        currentUser.companyId,
      ),
    };
  }

  @Delete('admin/:id/permanent')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async hardDelete(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.resumesService.hardDeleteResume(
      id,
      currentUser.userId,
      currentUser.name,
    );
  }

  @Delete(':id')
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.resumesService.softDeleteResume(
      id,
      currentUser.companyId,
      currentUser.userId,
      currentUser.email,
    );
  }

  @Patch(':id/restore')
  async restoreResume(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.resumesService.restoreResume(
      id,
      currentUser.companyId,
      currentUser.userId,
      currentUser.name,
    );
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const resume = await this.resumesService.downloadResumePdf(
      id,
      currentUser.companyId,
      currentUser.userId,
      currentUser.email,
    );

    return this.resumePdfService.generate(resume, res);
  }
}
