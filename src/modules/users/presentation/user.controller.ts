import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { UserService } from '../application/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('admin')
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.userService.create(dto, currentUser);
  }

  @Get()
  @Roles('admin')
  async listAll(@Query() query: ListUsersDto) {
    return this.userService.listAll(query);
  }

  @Get('export')
  @Roles('admin')
  async exportAll() {
    return this.userService.exportAll();
  }

  @Get('profile')
  async getProfile(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.userService.getProfile(currentUser.userId);
  }

  @Patch(':id/status')
  @Roles('admin', 'mod')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.userService.updateStatus(id, dto.status, currentUser);
  }

  @Patch(':id/password')
  @Roles('admin')
  async updatePassword(
    @Param('id') id: string,
    @Body() dto: UpdateUserPasswordDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.userService.updatePassword(id, dto.password, currentUser);
  }
}
