import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  // CORS abierto para desarrollo (celular se conecta por IP local)
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = process.env.PORT ?? 3001;
  // Escuchar en 0.0.0.0 para que sea accesible desde la red local
  await app.listen(port, '0.0.0.0');
  console.log(`SoluCorp API corriendo en http://0.0.0.0:${port}/api`);
}
void bootstrap();
