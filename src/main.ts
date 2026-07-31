import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar CORS para permitir peticiones desde el frontend de Angular
  app.enableCors();

  // Validaciones globales de DTOs con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades extra que no estén en el DTO
      transform: true, // Transforma tipos automáticamente (ej: strings a números si se solicita)
      forbidNonWhitelisted: true, // Lanza error si se envían propiedades extra
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Backend de Distribuidora Concepción corriendo en: http://localhost:${port}`);
}
bootstrap();
