import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { AdminService }     from './admin.service'
import { CreateUserDto }    from './dto/create-user.dto'
import { RenewUserDto }     from './dto/renew-user.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard'
import { RolesGuard }        from '../auth/guards/roles.guard'
import { Roles }             from '../auth/decorators/roles.decorator'

@Controller('admin')
@UseGuards(FirebaseAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers() {
    return this.adminService.listUsers()
  }

  @Post('users')
  @Roles('super_admin')
  createUser(@Body() dto: CreateUserDto, @Req() req: Request & { uid: string }) {
    return this.adminService.createUser(dto, req.uid)
  }

  @Patch('users/:uid/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  blockUser(@Param('uid') uid: string, @Req() req: Request & { uid: string }) {
    return this.adminService.blockUser(uid, req.uid)
  }

  @Patch('users/:uid/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  unblockUser(@Param('uid') uid: string, @Req() req: Request & { uid: string }) {
    return this.adminService.unblockUser(uid, req.uid)
  }

  @Patch('users/:uid/renew')
  renewUser(
    @Param('uid') uid: string,
    @Body() dto: RenewUserDto,
    @Req() req: Request & { uid: string },
  ) {
    return this.adminService.renewUser(uid, dto, req.uid)
  }

  @Patch('users/:uid/reset-password')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetUserPassword(
    @Param('uid') uid: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: Request & { uid: string },
  ) {
    return this.adminService.resetUserPassword(uid, dto.temporaryPassword, req.uid)
  }

  @Delete('users/:uid')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('uid') uid: string, @Req() req: Request & { uid: string }) {
    return this.adminService.deleteUser(uid, req.uid)
  }

  @Get('audit-log')
  @Roles('super_admin')
  getAuditLog() {
    return this.adminService.getAuditLog()
  }

  @Delete('audit-log')
  @Roles('super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearAuditLog() {
    return this.adminService.clearAuditLog()
  }
}
