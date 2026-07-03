import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService, State, User, WorkflowItem } from '../api.service';
import { STATE_TYPE_BY_VALUE } from '../constants';
import { TaskLedgerStore } from '../stores/task-ledger.store';
import { HlmButton } from '../ui/hlm-button.directive';

interface LedgerGroup {
  user: User;
  items: WorkflowItem[];
}

@Component({
  selector: 'app-task-ledger-page',
  imports: [HlmButton],
  host: { class: 'flex h-full flex-1 flex-col' },
  template: `
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-left">
            <th class="w-full px-4 py-3 font-medium text-muted-foreground">Item</th>
            <th class="w-px whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">State</th>
            <th class="w-px whitespace-nowrap px-4 py-3 font-medium text-muted-foreground">Days in state</th>
            <th class="w-16 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          @for (group of groups(); track group.user.id) {
            <tr class="border-b border-border bg-muted/40">
              <td colspan="4" class="px-4 py-2.5 font-medium">{{ group.user.name }}</td>
            </tr>
            @for (item of group.items; track item.id) {
              <tr class="border-b border-border transition-colors hover:bg-muted/30">
                <td class="border-r border-border px-4 py-2.5">{{ item.name }}</td>
                <td class="whitespace-nowrap border-r border-border px-4 py-2.5">
                  <span
                    class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                    [class]="badgeClass(item.currentState.type)"
                    >{{ item.currentState.name }}</span
                  >
                </td>
                <td class="whitespace-nowrap border-r border-border px-4 py-2.5 text-center text-muted-foreground">
                  @if (item.daysInState !== null) {
                    <span
                      [class.text-red-600]="item.daysInState > item.currentState.daysThreshold"
                      [class.font-semibold]="item.daysInState > item.currentState.daysThreshold"
                      >{{ item.daysInState }}</span
                    >
                  } @else {
                    <span class="text-gray-300">-</span>
                  }
                </td>
                <td class="relative px-3 py-1 text-center">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    aria-label="Row actions"
                    [attr.aria-expanded]="openMenuId() === item.id"
                    (click)="toggleMenu(item.id)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  @if (openMenuId() === item.id) {
                    <div class="absolute right-4 top-11 z-50 w-56 border border-border bg-popover text-left text-popover-foreground shadow-md">
                      <button
                        type="button"
                        class="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        (click)="openStatusModal(item)"
                      >
                        Update status
                      </button>
                    </div>
                  }
                </td>
              </tr>
            }
          } @empty {
            <tr class="border-b border-border">
              <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">No workflow items.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    @if (error(); as message) {
      <div class="border-t border-border px-4 py-2 text-sm text-destructive">{{ message }}</div>
    }

    @if (openMenuId() !== null) {
      <div class="fixed inset-0 z-40" (click)="closeMenu()"></div>
    }

    @if (modalItem(); as item) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" (click)="closeModal()"></div>
        <div
          class="relative z-10 w-full max-w-md rounded-lg border border-border bg-background shadow-lg"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-status-title"
        >
          <div class="border-b border-border px-6 py-4">
            <h2 id="update-status-title" class="text-lg font-semibold">Update status</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ item.name }} - currently
              <span
                class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                [class]="badgeClass(item.currentState.type)"
                >{{ item.currentState.name }}</span
              >
            </p>
          </div>

          <div class="max-h-80 overflow-y-auto py-2">
            @for (state of states(); track state.id) {
              <button
                type="button"
                class="flex w-full items-center gap-3 px-6 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                [disabled]="state.id === item.currentStateId"
                (click)="updateStatus(item, state)"
              >
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" [class]="dotClass(state.type)"></span>
                {{ state.name }}
                @if (state.id === item.currentStateId) {
                  <span class="ml-auto text-xs text-muted-foreground">current</span>
                }
              </button>
            }
          </div>

          <div class="flex justify-end border-t border-border px-6 py-4">
            <button hlmBtn variant="outline" (click)="closeModal()">Cancel</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TaskLedgerPage {
  private readonly api = inject(ApiService);
  private readonly store = inject(TaskLedgerStore);

  protected readonly items = this.store.items;
  protected readonly error = this.store.error;
  protected readonly states = toSignal(this.api.getStates(), { initialValue: [] as State[] });

  protected readonly openMenuId = signal<string | null>(null);
  protected readonly modalItem = signal<WorkflowItem | null>(null);

  protected readonly groups = computed<LedgerGroup[]>(() => {
    const byUser = new Map<string, LedgerGroup>();
    for (const item of this.items()) {
      const group = byUser.get(item.userId) ?? { user: item.user, items: [] };
      group.items.push(item);
      byUser.set(item.userId, group);
    }
    return [...byUser.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));
  });

  constructor() {
    this.store.load();
  }

  protected toggleMenu(itemId: string): void {
    this.openMenuId.update((open) => (open === itemId ? null : itemId));
  }

  protected closeMenu(): void {
    this.openMenuId.set(null);
  }

  protected openStatusModal(item: WorkflowItem): void {
    this.closeMenu();
    this.modalItem.set(item);
  }

  protected closeModal(): void {
    this.modalItem.set(null);
  }

  protected updateStatus(item: WorkflowItem, state: State): void {
    this.store.updateStatus(item, state);
    this.closeModal();
  }

  protected badgeClass(type: number): string {
    return STATE_TYPE_BY_VALUE.get(type)?.badgeClass ?? 'bg-gray-100 text-gray-700 border-gray-200';
  }

  protected dotClass(type: number): string {
    return STATE_TYPE_BY_VALUE.get(type)?.dotClass ?? 'bg-gray-400';
  }
}
