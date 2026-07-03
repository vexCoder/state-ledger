import { Injectable, inject, signal } from '@angular/core';
import { ApiService, State, WorkflowItem } from '../api.service';

@Injectable({ providedIn: 'root' })
export class TaskLedgerStore {
  private readonly api = inject(ApiService);

  readonly items = signal<WorkflowItem[]>([]);
  readonly updatingItemId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  load(): void {
    this.api.getWorkflowItems().subscribe({
      next: (items) => this.items.set(items),
      error: () => this.error.set('Failed to load workflow items.'),
    });
  }

  updateStatus(item: WorkflowItem, state: State): void {
    const previous = this.items();

    this.items.update((items) =>
      items.map((existing) =>
        existing.id === item.id
          ? { ...existing, currentStateId: state.id, currentState: state }
          : existing,
      ),
    );
    this.updatingItemId.set(item.id);
    this.error.set(null);

    this.api.updateWorkflowItemState(item.id, state.id).subscribe({
      next: (updated) => {
        this.items.update((items) =>
          items.map((existing) => (existing.id === updated.id ? updated : existing)),
        );
        this.updatingItemId.set(null);
      },
      error: () => {
        this.items.set(previous);
        this.updatingItemId.set(null);
        this.error.set('Status update failed.');
      },
    });
  }
}
