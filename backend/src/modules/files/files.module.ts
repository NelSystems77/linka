import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'

// File encryption/decryption happens entirely client-side (E2EE).
// This module exists for future server-side file management endpoints (e.g. quota, metadata).
@Module({
  imports: [AuthModule],
})
export class FilesModule {}
