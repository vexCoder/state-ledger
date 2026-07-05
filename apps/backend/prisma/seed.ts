import { Prisma, PrismaClient } from '@prisma/client';

process.env.DATABASE_URL ??= 'file:./dev.sqlite';

const prisma = new PrismaClient();

const STATES = [
  { name: 'To Do', type: 1, daysThreshold: null },
  { name: 'In Progress', type: 2, daysThreshold: 10 },
  { name: 'In Review', type: 2, daysThreshold: 3 },
  { name: 'In Signing', type: 2, daysThreshold: 3 },
  { name: 'On Hold', type: 3, daysThreshold: 5 },
  { name: 'Completed', type: 4, daysThreshold: null },
];

const TASK_NAMES = [
  'Draft supplier contract',
  'Review NDA with Acme',
  'Prepare Q3 budget',
  'Onboard new vendor',
  'Renew office lease',
  'Audit expense reports',
  'Update privacy policy',
  'Sign partnership agreement',
  'Migrate payroll system',
  'Approve marketing plan',
  'Close annual accounts',
  'File trademark renewal',
  'Negotiate license terms',
  'Publish security review',
  'Archive legacy records',
];

const WORKFLOW_ITEM_COUNT = TASK_NAMES.length;

async function main() {
  await prisma.state.createMany({ data: STATES });
  const states = await prisma.state.findMany();

  const will = await prisma.user.create({ data: { name: 'Will McTavish' } });
  const mona = await prisma.user.create({ data: { name: 'Mona Fitzgerald' } });

  await prisma.workflowItem.createMany({
    data: TASK_NAMES.map((name, i) => ({
      name,
      currentStateId: states[i % states.length].id,
      userId: i % 2 === 0 ? will.id : mona.id,
    })),
  });

  const todo = states.find((s) => s.type === 1)!;
  const items = await prisma.workflowItem.findMany({
    include: { currentState: true },
  });

  const granularity = process.env.DAYS_IN_STATE_GRANULARITY ?? 'daily';
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const offsetFor = (i: number) =>
    granularity === 'hourly' ? ((i % 10) + 1) * 3 * HOUR : ((i % 10) + 1) * DAY;

  const ledgerRows = items.flatMap((item, i): Prisma.StateLedgerCreateManyInput[] => {
    if (item.currentStateId === todo.id) {
      return [
        {
          workflowItemId: item.id,
          stateId: todo.id,
          stateName: todo.name,
          stateType: todo.type,
          dateStart: null,
          dateEnd: null,
        },
      ];
    }
    const transitionedAt = new Date(Date.now() - offsetFor(i));
    return [
      {
        workflowItemId: item.id,
        stateId: todo.id,
        stateName: todo.name,
        stateType: todo.type,
        dateStart: null,
        dateEnd: transitionedAt,
      },
      {
        workflowItemId: item.id,
        stateId: item.currentStateId,
        stateName: item.currentState.name,
        stateType: item.currentState.type,
        dateStart: transitionedAt,
        dateEnd: null,
      },
    ];
  });
  await prisma.stateLedger.createMany({ data: ledgerRows });

  console.log(
    `Seeded ${STATES.length} states, 2 users, ${WORKFLOW_ITEM_COUNT} workflow items, ${ledgerRows.length} ledger entries`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
