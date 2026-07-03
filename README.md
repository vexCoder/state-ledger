# State Ledger

A small full-stack app that tracks workflow items as they move through states, records every
transition in a **state ledger**, and reports how many days each item has spent in its current
state.

## Stack

| Layer    | Tech                                                              |
| -------- | ----------------------------------------------------------------- |
| Monorepo | pnpm workspaces + Turborepo                                       |
| Backend  | NestJS 11, Prisma 6, SQLite, @nestjs/event-emitter                |
| Frontend | Angular 21 (standalone, signals), Tailwind CSS v4, shadcn-style UI |

## Getting started

Prerequisites: **Node.js ≥ 24.15** and **pnpm ≥ 10**.

```bash
pnpm install
pnpm dev
```

That is all. On first run the backend detects there is no database, creates `dev.sqlite`,
applies the migration, and seeds demo data automatically.

| App      | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:4200 |
| Backend  | http://localhost:3000 |

To reset to a fresh database: stop the dev servers, delete
`apps/backend/prisma/dev.sqlite`, and run `pnpm dev` again.

## The app

Navigation is behind the burger menu (top left). Two pages:

### Task Mappings

Manage states: name, state type, and **days threshold** (target days). Add rows with
*Add state*, remove with the ✕. The *Submit* button enables only when something actually
changed and saves everything in one request.

State types are hardcoded:

| Type | Name        | Color  |
| ---- | ----------- | ------ |
| 1    | To Do       | Purple |
| 2    | In Progress | Blue   |
| 3    | On Hold     | Orange |
| 4    | Completed   | Green  |

### Task Ledger

All workflow items grouped by user. Each row shows the item name, its current state
(colored chip) and **days in state**. The burger on the right of each row opens
*Update status*, which opens a modal to move the item to another state.

Days in state:

- Accumulates only for **In Progress** and **On Hold** state types. To Do and Completed
  show a dash.
- Is the **sum across all visits** to the current state (an item can leave a state and
  come back. every visit counts).
- Turns **red** when it exceeds the state's days threshold.

### Debug panel (time simulation)

The floating **Debug time** panel simulates "today" server-side. *Prev day / Next day*
shift the app clock by 24h and the ledger reloads, so you can watch days-in-state grow
without waiting a real day. *Reset to real time* clears the offset. Drag it anywhere by
its header (position is remembered). The offset lives in backend memory. a backend
restart returns to real time.

## How the ledger works

Every item is born in **To Do** with a ledger row that has **no start date** (it has been
there since creation) and no end date.

On every state change the backend:

1. Validates the target state and the item, and that the state actually changed
   (same state = no-op, no event).
2. Updates the item's current state.
3. Emits a `workflow-item.state-changed` event. A listener reacts by closing the open
   ledger row (sets its end date) and opening a new row (start date = now, no end date).

So the write path is: `PATCH /workflow-items/:id/state` → `WorkflowItemService.changeState()`
→ event → `WorkflowItemStateChangedListener.writeLedger()`. Side effects of a state change
belong in listeners. add more `@OnEvent` handlers next to the ledger writer.

Days in state is computed on read from the ledger intervals (`dateEnd ?? now` minus
`dateStart ?? createdAt`, summed per state). There is intentionally no overnight
recalculation cron: computing on read is always fresh, follows simulated time, and avoids
rewriting every row nightly.

## Configuration

`apps/backend/.env`:

| Variable                    | Values              | Effect                                            |
| --------------------------- | ------------------- | ------------------------------------------------- |
| `DATABASE_URL`              | file path           | SQLite location                                   |
| `DAYS_IN_STATE_GRANULARITY` | `daily` \| `hourly` | Whole days vs hour-precise fractional days. Also affects seed data spread. |

Restart the backend after changing values.

## API

| Method | Path                        | Description                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | `/states`                   | List states                                  |
| PUT    | `/states`                   | Bulk save (create / update / delete) states  |
| GET    | `/workflow-items`           | Items with user, state, and `daysInState`    |
| PATCH  | `/workflow-items/:id/state` | Change an item's state (writes the ledger)   |
| GET    | `/debug/time`               | Current simulated time                       |
| PUT    | `/debug/time`               | Set offset (`{ "offsetHours": 48 }`)         |

## Data model

```
State          id, name, type (1-4), daysThreshold
User           id, name
WorkflowItem   id, name, currentStateId → State, userId → User
StateLedger    id, workflowItemId → WorkflowItem, stateId → State,
               stateType (snapshot), dateStart?, dateEnd?
```

- `dateStart` null → in that state since the item was created (only the birth To Do row).
- `dateEnd` null → the item is currently in that state.
- `stateType` is a snapshot so history survives later edits to the state.

All ids are UUIDs. The schema lives in `apps/backend/prisma/schema.prisma` as a single
`init` migration.

## Testing walkthrough

1. `pnpm dev`, open http://localhost:4200.
2. Task Ledger: pick an In Progress item, note its days in state.
3. Debug panel → *Next day*: the number grows by 1. Cross the state's threshold and it
   turns red.
4. Update an item's status, then bring it back to the original state: previous days are
   kept (visits are summed).
5. Set `DAYS_IN_STATE_GRANULARITY="hourly"` in `apps/backend/.env`, restart, delete the
   DB for reseeded hourly data. days now show two decimals and grow with each simulated
   day as fractions accumulate per hour.
