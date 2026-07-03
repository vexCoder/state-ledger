export const WORKFLOW_ITEM_STATE_CHANGED = 'workflow-item.state-changed';

export class WorkflowItemStateChangedEvent {
  constructor(
    public readonly workflowItemId: string,
    public readonly fromStateId: string,
    public readonly toStateId: string,
    public readonly userId: string,
    public readonly changedAt: Date,
  ) {}
}
