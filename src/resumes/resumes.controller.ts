import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Delete,
  Param,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  Patch,
  Res,
} from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload/upload.service';
import { Roles } from '../auth/decorator/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SearchResumeDto } from './dto/search-resume.dto';
import { ResumePdfService } from './resume-pdf.service';

@Controller('api/v1/resumes')
@UseGuards(JwtAuthGuard)
export class ResumesController {
  constructor(
    private readonly resumesService: ResumesService,
    private readonly uploadService: UploadService,
    private readonly resumePdfService: ResumePdfService
  ) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: any,
    @Req() req,
  ) {
    return this.uploadService.upload(file, req.user);
  }

  @Post('upload/bulk')
  @UseInterceptors(
    FilesInterceptor('files'),
  )
  uploadBulk(
    @UploadedFiles() files: any[],
    @Req() req,
  ) {
    return this.uploadService.uploadBulk(
      files,
      req.user,
    );
  }

  @Post('upload/bulk/start')
  @UseInterceptors(
    FilesInterceptor('files'),
  )
  startBulkUpload(
    @UploadedFiles() files: any[],
    @Req() req,
  ) {
    return this.uploadService.startBulkUpload(
      files,
      req.user,
    );
  }

  @Get('upload/bulk/status/:jobId')
  getBulkStatus(
    @Param('jobId') jobId: string,
    @Req() req,
  ) {
    return this.uploadService.getBulkStatus(
      jobId,
      req.user,
    );
  }

  @Post()
  create(
    @Body() dto: CreateResumeDto,
    @Req() req,
  ) {
    return this.resumesService.create(dto, req.user);
  }

  @Get()
  findAll(
    @Req() req,
    @Query() query: SearchResumeDto,
  ) {
    return this.resumesService.findAllWithCompatibility(
      req.user,
      query,
    );
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard)
  async getRecentResumes(@Request() req) {
    const user = req.user;

    const companyId =
      user.role === 'admin'
        ? user.companyId
        : user.companyId;

    return {
      resumes: await this.resumesService.getRecentResumes(companyId),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async softDelete(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.resumesService.softDeleteResume(id, req.user.companyId, req.user.userId, req.user.email)
  }

  @Delete('/admin/:id/permanent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async hardDelete(
    @Param('id') id: string,
    @Request() req
  ) {
    return this.resumesService.hardDeleteResume(id, req.user.userId, req.user.name)
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restoreResume(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.resumesService.restoreResume(
      id,
      req.user.companyId,
      req.user.userId,
      req.user.name,
    )
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @Request() req,
    @Res() res,
  ) {
    const resume =
      await this.resumesService.downloadResumePdf(
        id,
        req.user.companyId,
        req.user.userId,
        req.user.email,
      );

    return this.resumePdfService.generate(
      resume,
      res,
    );
  }
}