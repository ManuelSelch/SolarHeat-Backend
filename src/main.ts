import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  createSwagger(app);
  
  await app.listen(process.env.PORT ?? 3000);
}

function createSwagger(app: INestApplication) {
	const config = new DocumentBuilder()
		.setTitle('My API')
		.setDescription('API description')
		.build();

	const documentFactory = () => SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, documentFactory);
}

bootstrap();
