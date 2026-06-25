import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { DevUserMiddleware } from './auth/dev-user.middleware';
import { DocumentsModule } from './documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, DevUserMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // TODO: Replace DevUserMiddleware with JWT authentication.
    consumer.apply(DevUserMiddleware).forRoutes('*');
  }
}
