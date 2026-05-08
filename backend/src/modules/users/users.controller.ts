import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { UsersService }      from './users.service'
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard'

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll()
  }

  @Get(':uid')
  findOne(@Param('uid') uid: string) {
    return this.usersService.findOne(uid)
  }
}
