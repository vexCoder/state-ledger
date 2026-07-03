import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
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
    return this.prisma.state.findMany({ orderBy: { createdAt: 'asc' } });
  }

  @Put('states')
  async saveStates(@Body() states: SaveStateDto[]) {
    const incomingIds = states.filter((s) => s.id).map((s) => s.id as string);

    await this.prisma.$transaction([
      this.prisma.state.deleteMany({ where: { id: { notIn: incomingIds } } }),
      ...states.map((s) =>
        s.id
          ? this.prisma.state.update({
              where: { id: s.id },
              data: { name: s.name, type: s.type, daysThreshold: s.daysThreshold },
            })
          : this.prisma.state.create({
              data: { name: s.name, type: s.type, daysThreshold: s.daysThreshold },
            }),
      ),
    ]);

    return this.prisma.state.findMany({ orderBy: { createdAt: 'asc' } });
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
