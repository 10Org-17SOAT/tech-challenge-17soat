import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Env } from './shared/config/env/env.schema';
import { setupSwagger } from './shared/config/swagger/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupSwagger(app);

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get('PORT', { infer: true });

  await app.listen(port);
}
bootstrap();
