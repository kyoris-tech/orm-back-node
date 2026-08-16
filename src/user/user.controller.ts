import { Body, Controller, Get, Param, Patch, Post, Req, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserService } from "./user.service";
import { Roles } from "../auth/decorator/roles.decorator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";


@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class userController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.userService.create(dto, req.user)
  }

  @Get()
  @Roles('admin')
  async listAll() {
    return this.userService.listAll();
  }

  @Get('export')
  @Roles('admin')
  async exportAll() {
    return this.userService.exportAll();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'mod')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    return this.userService.updateStatus(
      id,
      dto.status,
      req.user
    )
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(
    @Request() req,
  ) {
    return this.userService.getProfile(
      req.user.userId,
    );
  }
}