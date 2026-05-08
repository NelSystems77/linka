import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true)
      if (origin === process.env.FRONTEND_URL) return callback(null, true)
      callback(new Error(`CORS: origin not allowed — ${origin}`))
    },
    credentials: true,
  })
  app.setGlobalPrefix('api/v1')

  await app.listen(process.env.PORT ?? 3001)
  console.log(`Linka backend running on :${process.env.PORT ?? 3001}`)
}
bootstrap()
