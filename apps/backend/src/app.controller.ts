import { Body, ConflictException, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TimeService } from './time.service';
import { WorkflowItemService } from './workflow-item.service';

interface SaveStateDto {
  id?: string;
  name: string;
  type: number;
  daysThreshold: number | null;
}

@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowItems: WorkflowItemService,
    private readonly time: TimeService,
  ) {}

  @Get('debug/time')
  getDebugTime() {
    return this.time.state();
  }

  @Put('debug/time')
  setDebugTime(@Body() body: { offsetHours?: number; offsetDays?: number }) {
    this.time.setOffsetHours(body.offsetHours ?? (body.offsetDays ?? 0) * 24);
    return this.time.state();
  }

  @Get()
  getHello() {
    return { status: 'ok', service: 'backend' };
  }

  @Get('states')
  getStates() {
    return this.prisma.state.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Put('states')
  async saveStates(@Body() states: SaveStateDto[]) {
    const incomingIds = states.filter((s) => s.id).map((s) => s.id as string);

    await this.prisma.$transaction(async (tx) => {
      const blocked = await tx.state.findMany({
        where: {
          id: { notIn: incomingIds },
          deletedAt: null,
          workflowItems: { some: {} },
        },
        select: { name: true },
      });
      if (blocked.length > 0) {
        const names = blocked.map((s) => s.name);
        throw new ConflictException({
          message: `States still in use by workflow items: ${names.join(', ')}`,
          blockedStates: names,
        });
      }

      await tx.state.updateMany({
        where: { id: { notIn: incomingIds }, deletedAt: null },
        data: { deletedAt: this.time.now() },
      });

      for (const s of states) {
        if (s.id) {
          await tx.state.update({
            where: { id: s.id },
            data: { name: s.name, type: s.type, daysThreshold: s.daysThreshold },
          });
        } else {
          await tx.state.create({
            data: { name: s.name, type: s.type, daysThreshold: s.daysThreshold },
          });
        }
      }
    });

    return this.getStates();
  }

  @Get('workflow-items')
  getWorkflowItems() {
    return this.workflowItems.listItems();
  }

  @Patch('workflow-items/:id/state')
  updateWorkflowItemState(@Param('id') id: string, @Body() body: { stateId: string }) {
    return this.workflowItems.changeState(id, body.stateId);
  }
}
