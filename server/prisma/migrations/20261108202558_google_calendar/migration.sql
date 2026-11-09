-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "slotId" TEXT,
    "clientName" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "holdUntil" DATETIME,
    "source" TEXT NOT NULL DEFAULT 'site',
    "remindedDayAt" DATETIME,
    "reminderSentAt" DATETIME,
    "followUpSentAt" DATETIME,
    "gcalEventId" TEXT,
    "gcalSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("clientName", "createdAt", "date", "durationMin", "followUpSentAt", "holdUntil", "id", "price", "remindedDayAt", "reminderSentAt", "serviceId", "slotId", "source", "status", "userId", "updatedAt") SELECT "clientName", "createdAt", "date", "durationMin", "followUpSentAt", "holdUntil", "id", "price", "remindedDayAt", "reminderSentAt", "serviceId", "slotId", "source", "status", "userId", "createdAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_slotId_key" ON "Booking"("slotId");
CREATE INDEX "Booking_status_date_idx" ON "Booking"("status", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
