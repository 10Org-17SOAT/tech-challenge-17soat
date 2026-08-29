import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '@/app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { Env } from '@/shared/config/env/env.schema';
import { setupSwagger } from '@/shared/config/swagger/swagger.config';

const _LOCALPORT = 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupSwagger(app);

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get('PORT', { infer: true });

  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(port, () => {
    console.log(
      `Server is running on http://localhost:${port ?? _LOCALPORT}/docs`,
    );
  });
}
bootstrap();
