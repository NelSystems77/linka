import { Module, MiddlewareConsumer } from '@nestjs/common'
import { FirebaseModule }   from './firebase/firebase.module'
import { AuthModule }       from './modules/auth/auth.module'
import { UsersModule }      from './modules/users/users.module'
import { MessagingModule }  from './modules/messaging/messaging.module'
import { FilesModule }      from './modules/files/files.module'
import { AdminModule }      from './modules/admin/admin.module'
import { AccountExpiryMiddleware } from './common/middleware/account-expiry.middleware'
import { HealthController } from './health.controller'

@Module({
  imports: [
    FirebaseModule,
    AuthModule,
    UsersModule,
    MessagingModule,
    FilesModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccountExpiryMiddleware)
      .exclude('/api/v1/auth/(.*)', '/api/v1/health')
      .forRoutes('*')
  }
}
