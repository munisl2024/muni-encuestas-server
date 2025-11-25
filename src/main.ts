import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as morgan from 'morgan';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  // Seteamos el prefijo de la API
  app.setGlobalPrefix('api');

  // MORGAN - DEV
  app.use(morgan('dev'));

  // Acceso a las variables de entorno
  const configService = app.get(ConfigService);

  // Validaciones
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    // forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true
    }
  }))

  // CORS
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.listen(configService.get('PORT') ?? 3000);
  
}
bootstrap();
