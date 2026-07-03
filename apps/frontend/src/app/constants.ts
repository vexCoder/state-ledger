export const STATE_TYPES = {
  TODO: 1,
  IN_PROGRESS: 2,
  ON_HOLD: 3,
  COMPLETED: 4,
} as const;

export type StateType = (typeof STATE_TYPES)[keyof typeof STATE_TYPES];

export interface StateTypeOption {
  value: StateType;
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const STATE_TYPE_OPTIONS: StateTypeOption[] = [
  {
    value: STATE_TYPES.TODO,
    label: 'To Do',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-700',
    dotClass: 'bg-purple-500',
  },
  {
    value: STATE_TYPES.IN_PROGRESS,
    label: 'In Progress',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-700',
    dotClass: 'bg-blue-500',
  },
  {
    value: STATE_TYPES.ON_HOLD,
    label: 'On Hold',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-700',
    dotClass: 'bg-orange-500',
  },
  {
    value: STATE_TYPES.COMPLETED,
    label: 'Completed',
    badgeClass: 'bg-green-50 text-green-700 border-green-700',
    dotClass: 'bg-green-500',
  },
];

export const STATE_TYPE_BY_VALUE: ReadonlyMap<number, StateTypeOption> = new Map(
  STATE_TYPE_OPTIONS.map((option) => [option.value, option]),
);
