import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { TimeService } from './time.service';
import { WorkflowItemService } from './workflow-item.service';
import { WorkflowItemStateChangedListener } from './events/workflow-item-state-changed.listener';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), EventEmitterModule.forRoot()],
  controllers: [AppController],
  providers: [PrismaService, TimeService, WorkflowItemService, WorkflowItemStateChangedListener],
})
export class AppModule {}
