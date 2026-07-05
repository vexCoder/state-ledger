import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { STATE_TYPES } from './constants';
import { PrismaService } from './prisma.service';
import { TimeService } from './time.service';
import {
  WORKFLOW_ITEM_STATE_CHANGED,
  WorkflowItemStateChangedEvent,
} from './events/workflow-item-state-changed.event';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const ACCUMULATING_TYPES: number[] = [STATE_TYPES.IN_PROGRESS, STATE_TYPES.ON_HOLD];

interface LedgerInterval {
  stateId: string;
  dateStart: Date | null;
  dateEnd: Date | null;
}

@Injectable()
export class WorkflowItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
    private readonly time: TimeService,
  ) {}

  async listItems() {
    const granularity = this.config.get<string>('DAYS_IN_STATE_GRANULARITY') ?? 'daily';
    const items = await this.prisma.workflowItem.findMany({
      include: { currentState: true, user: true, ledgerEntries: true },
    });

    return items.map(({ ledgerEntries, ...item }) => ({
      ...item,
      daysInState: this.daysInState(item, ledgerEntries, granularity),
    }));
  }

  private daysInState(
    item: { currentStateId: string; createdAt: Date; currentState: { type: number } },
    entries: LedgerInterval[],
    granularity: string,
  ): number | null {
    if (!ACCUMULATING_TYPES.includes(item.currentState.type)) return null;

    const now = this.time.now().getTime();
    const totalMs = entries
      .filter((entry) => entry.stateId === item.currentStateId)
      .reduce((sum, entry) => {
        const start = (entry.dateStart ?? item.createdAt).getTime();
        const end = entry.dateEnd ? entry.dateEnd.getTime() : now;
        return sum + Math.max(0, end - start);
      }, 0);

    return granularity === 'hourly'
      ? Math.round((Math.floor(totalMs / HOUR) / 24) * 100) / 100
      : Math.floor(totalMs / DAY);
  }

  async changeState(itemId: string, stateId: string) {
    const state = await this.prisma.state.findUnique({ where: { id: stateId } });
    if (!state || state.deletedAt) throw new NotFoundException(`State ${stateId} not found`);

    const item = await this.prisma.workflowItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Workflow item ${itemId} not found`);

    if (item.currentStateId === stateId) {
      return this.getItem(itemId);
    }

    const now = this.time.now();
    await this.prisma.workflowItem.update({
      where: { id: itemId },
      data: { currentStateId: stateId },
    });

    await this.events.emitAsync(
      WORKFLOW_ITEM_STATE_CHANGED,
      new WorkflowItemStateChangedEvent(itemId, item.currentStateId, stateId, item.userId, now),
    );

    return this.getItem(itemId);
  }

  private async getItem(itemId: string) {
    const granularity = this.config.get<string>('DAYS_IN_STATE_GRANULARITY') ?? 'daily';
    const item = await this.prisma.workflowItem.findUnique({
      where: { id: itemId },
      include: { currentState: true, user: true, ledgerEntries: true },
    });
    if (!item) return null;
    const { ledgerEntries, ...rest } = item;
    return {
      ...rest,
      daysInState: this.daysInState(item, ledgerEntries, granularity),
    };
  }
}
