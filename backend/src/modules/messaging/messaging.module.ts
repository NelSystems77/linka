import { Module } from '@nestjs/common'
import { MessagingGateway } from './messaging.gateway'
import { AuthModule }       from '../auth/auth.module'

@Module({
  imports:   [AuthModule],
  providers: [MessagingGateway],
})
export class MessagingModule {}
