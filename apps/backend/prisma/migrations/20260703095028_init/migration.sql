-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "daysThreshold" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WorkflowItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currentStateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkflowItem_currentStateId_fkey" FOREIGN KEY ("currentStateId") REFERENCES "State" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkflowItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflowItemId" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "stateType" INTEGER NOT NULL,
    "dateStart" DATETIME,
    "dateEnd" DATETIME,
    CONSTRAINT "StateLedger_workflowItemId_fkey" FOREIGN KEY ("workflowItemId") REFERENCES "WorkflowItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StateLedger_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
