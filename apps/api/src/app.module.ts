import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { DevUserMiddleware } from './auth/dev-user.middleware';
import { DocumentsModule } from './documents/documents.module';
import { SubmissionsModule } from './submissions/submissions.module';

@Module({
  imports: [DocumentsModule, SubmissionsModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, DevUserMiddleware],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // TODO: Replace DevUserMiddleware with JWT authentication.
    consumer.apply(DevUserMiddleware).forRoutes('*');
  }
}
