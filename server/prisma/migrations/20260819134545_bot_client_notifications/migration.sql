-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "remindedDayAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL DEFAULT 'client',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "telegram" TEXT,
    "username" TEXT,
    "passwordHash" TEXT,
    "telegramChatId" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'uk',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "id", "name", "passwordHash", "phone", "role", "telegram", "telegramChatId", "username") SELECT "createdAt", "id", "name", "passwordHash", "phone", "role", "telegram", "telegramChatId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
