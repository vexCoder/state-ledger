import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma.service';
import {
  WORKFLOW_ITEM_STATE_CHANGED,
  WorkflowItemStateChangedEvent,
} from './workflow-item-state-changed.event';

@Injectable()
export class WorkflowItemStateChangedListener {
  private readonly logger = new Logger(WorkflowItemStateChangedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(WORKFLOW_ITEM_STATE_CHANGED, { async: true })
  async writeLedger(event: WorkflowItemStateChangedEvent) {
    const state = await this.prisma.state.findUnique({ where: { id: event.toStateId } });
    if (!state) {
      this.logger.error(`State ${event.toStateId} vanished before ledger write`);
      return;
    }

    await this.prisma.$transaction([
      this.prisma.stateLedger.updateMany({
        where: { workflowItemId: event.workflowItemId, dateEnd: null },
        data: { dateEnd: event.changedAt },
      }),
      this.prisma.stateLedger.create({
        data: {
          workflowItemId: event.workflowItemId,
          stateId: state.id,
          stateType: state.type,
          dateStart: event.changedAt,
        },
      }),
    ]);

    this.logger.log(
      `Ledger: item ${event.workflowItemId} moved ${event.fromStateId} -> ${event.toStateId}`,
    );
  }
}
