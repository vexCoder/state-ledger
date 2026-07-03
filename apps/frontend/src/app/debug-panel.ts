import { Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, DebugTime } from './api.service';
import { TaskLedgerStore } from './stores/task-ledger.store';

@Component({
  selector: 'app-debug-panel',
  imports: [DatePipe],
  template: `
    <div
      class="fixed z-100 w-64 select-none rounded-lg border border-border bg-background shadow-lg"
      [style.left.px]="pos().x"
      [style.top.px]="pos().y"
    >
      <div
        class="flex cursor-move items-center justify-between rounded-t-lg border-b border-border bg-muted/40 px-3 py-2"
        (pointerdown)="startDrag($event)"
      >
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Debug time</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 4h.01M7 12h.01M7 20h.01M17 4h.01M17 12h.01M17 20h.01" />
        </svg>
      </div>

      <div class="px-3 py-3">
        @if (time(); as t) {
          <p class="text-center text-sm font-medium">{{ t.today | date: 'mediumDate' }}</p>
          <p class="text-center text-xs text-muted-foreground">
            {{ t.offsetDays === 0 ? 'real time' : (t.offsetDays > 0 ? '+' : '') + t.offsetDays + ' days' }}
          </p>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-md border border-border px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              (click)="shift(-24)"
            >
              ◀ Prev day
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center justify-center rounded-md border border-border px-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              (click)="shift(24)"
            >
              Next day ▶
            </button>
          </div>
          <button
            type="button"
            class="mt-2 w-full rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            [disabled]="t.offsetHours === 0"
            (click)="reset()"
          >
            Reset to real time
          </button>
        } @else {
          <p class="text-center text-xs text-muted-foreground">Loading…</p>
        }
      </div>
    </div>
  `,
})
export class DebugPanel {
  private readonly api = inject(ApiService);
  private readonly ledgerStore = inject(TaskLedgerStore);

  private static readonly POS_KEY = 'debug-panel-pos';

  protected readonly time = signal<DebugTime | null>(null);
  protected readonly pos = signal(this.loadPos());

  private dragOffset = { x: 0, y: 0 };

  constructor() {
    this.api.getDebugTime().subscribe((t) => this.time.set(t));
    effect(() => localStorage.setItem(DebugPanel.POS_KEY, JSON.stringify(this.pos())));
  }

  private loadPos(): { x: number; y: number } {
    try {
      const saved = JSON.parse(localStorage.getItem(DebugPanel.POS_KEY) ?? '');
      if (typeof saved?.x === 'number' && typeof saved?.y === 'number') {
        return {
          x: Math.min(Math.max(0, saved.x), window.innerWidth - 60),
          y: Math.min(Math.max(0, saved.y), window.innerHeight - 60),
        };
      }
    } catch {
    }
    return { x: 16, y: 16 };
  }

  protected shift(deltaHours: number): void {
    const current = this.time()?.offsetHours ?? 0;
    this.apply(current + deltaHours);
  }

  protected reset(): void {
    this.apply(0);
  }

  private apply(offsetHours: number): void {
    this.api.setDebugTime(offsetHours).subscribe((t) => {
      this.time.set(t);
      this.ledgerStore.load();
    });
  }

  protected startDrag(event: PointerEvent): void {
    event.preventDefault();
    this.dragOffset = { x: event.clientX - this.pos().x, y: event.clientY - this.pos().y };
    const move = (e: PointerEvent) =>
      this.pos.set({
        x: Math.max(0, e.clientX - this.dragOffset.x),
        y: Math.max(0, e.clientY - this.dragOffset.y),
      });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
}
