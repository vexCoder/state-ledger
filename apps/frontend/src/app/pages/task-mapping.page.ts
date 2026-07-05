import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, State } from '../api.service';
import { STATE_TYPE_BY_VALUE, STATE_TYPE_OPTIONS, STATE_TYPES, StateType } from '../constants';
import { HlmButton } from '../ui/hlm-button.directive';

interface MappingRow {
  localId: number;
  id?: string;
  name: string;
  type: StateType;
  daysThreshold: number | null;
}

@Component({
  selector: 'app-task-mapping-page',
  imports: [FormsModule, HlmButton],
  host: { class: 'flex h-full flex-1 flex-col' },
  template: `
    <div class="flex-1 overflow-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border bg-muted/40 text-left">
            <th class="px-4 py-3 font-medium text-muted-foreground">State name</th>
            <th class="px-4 py-3 font-medium text-muted-foreground">State type</th>
            <th class="px-4 py-3 font-medium text-muted-foreground">Days threshold</th>
            <th class="w-16 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.localId) {
            <tr class="border-b border-border transition-colors hover:bg-muted/30">
              <td class="border-r border-border p-0">
                <input
                  type="text"
                  [(ngModel)]="row.name"
                  (ngModelChange)="markChanged()"
                  placeholder="State name"
                  class="h-11 w-full bg-transparent px-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                />
              </td>
              <td class="border-r border-border p-0">
                <div class="flex h-11 items-center gap-2 px-4">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" [class]="dotClass(row.type)"></span>
                  <select
                    [(ngModel)]="row.type"
                    (ngModelChange)="markChanged()"
                    class="h-full w-full bg-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    @for (option of stateTypeOptions; track option.value) {
                      <option [ngValue]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </div>
              </td>
              <td class="border-r border-border p-0">
                <div class="flex h-11 items-center">
                  <input
                    type="number"
                    min="0"
                    [(ngModel)]="row.daysThreshold"
                    (ngModelChange)="markChanged()"
                    placeholder="No threshold"
                    class="h-full w-full bg-transparent px-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
                  />
                  @if (row.daysThreshold !== null) {
                    <button
                      type="button"
                      class="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      aria-label="Clear threshold"
                      (click)="clearThreshold(row)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  }
                </div>
              </td>
              <td class="p-0 text-center">
                <button
                  type="button"
                  class="inline-flex h-11 w-full items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                  aria-label="Remove row"
                  (click)="removeRow(row.localId)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          } @empty {
            <tr class="border-b border-border">
              <td colspan="4" class="px-4 py-8 text-center text-muted-foreground">
                No states yet. Add one below.
              </td>
            </tr>
          }
          <tr>
            <td colspan="4" class="p-0">
              <button
                type="button"
                class="flex h-11 w-full items-center gap-2 px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                (click)="addRow()"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add state
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
      @if (error()) {
        <span class="text-sm text-destructive">{{ error() }}</span>
      }
      <button hlmBtn [disabled]="!dirty() || saving()" (click)="submit()">
        {{ saving() ? 'Saving…' : 'Submit' }}
      </button>
    </div>
  `,
})
export class TaskMappingPage {
  private readonly api = inject(ApiService);

  protected readonly stateTypeOptions = STATE_TYPE_OPTIONS;

  private nextLocalId = 1;
  private readonly version = signal(0);
  private readonly original = signal<string>('[]');

  protected readonly rows = signal<MappingRow[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly dirty = computed(() => {
    this.version();
    return this.serialize(this.rows()) !== this.original();
  });

  constructor() {
    this.api.getStates().subscribe((states) => this.reset(states));
  }

  protected addRow(): void {
    this.rows.update((rows) => [
      ...rows,
      { localId: this.nextLocalId++, name: '', type: STATE_TYPES.TODO, daysThreshold: null },
    ]);
    this.markChanged();
  }

  protected removeRow(localId: number): void {
    this.rows.update((rows) => rows.filter((row) => row.localId !== localId));
    this.markChanged();
  }

  protected markChanged(): void {
    this.version.update((v) => v + 1);
  }

  protected clearThreshold(row: MappingRow): void {
    row.daysThreshold = null;
    this.markChanged();
  }

  protected submit(): void {
    this.saving.set(true);
    this.error.set(null);
    const payload = this.rows().map(({ id, name, type, daysThreshold }) => ({
      id,
      name,
      type,
      daysThreshold: daysThreshold === null ? null : Number(daysThreshold),
    }));
    this.api.saveStates(payload).subscribe({
      next: (states) => {
        this.reset(states);
        this.saving.set(false);
      },
      error: (err) => {
        const blocked = err?.error?.blockedStates as string[] | undefined;
        this.error.set(
          blocked?.length
            ? `Cannot delete state(s) still in use: ${blocked.join(', ')}. Move those workflow items to another state first.`
            : 'Save failed. Please try again.',
        );
        this.saving.set(false);
      },
    });
  }

  protected dotClass(type: StateType): string {
    return STATE_TYPE_BY_VALUE.get(type)?.dotClass ?? 'bg-gray-400';
  }

  private reset(states: State[]): void {
    this.rows.set(
      [...states]
        .sort((a, b) => a.type - b.type)
        .map((state) => ({
        localId: this.nextLocalId++,
        id: state.id,
        name: state.name,
        type: state.type as StateType,
        daysThreshold: state.daysThreshold,
      })),
    );
    this.original.set(this.serialize(this.rows()));
    this.markChanged();
  }

  private serialize(rows: MappingRow[]): string {
    return JSON.stringify(
      rows.map(({ id, name, type, daysThreshold }) => ({ id, name, type, daysThreshold })),
    );
  }
}
