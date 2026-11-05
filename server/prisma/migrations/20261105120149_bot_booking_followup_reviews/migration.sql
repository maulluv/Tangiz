-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "followUpSentAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "serviceId" TEXT,
    "textUk" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'site',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Review" ("createdAt", "id", "name", "published", "rating", "serviceId", "textEn", "textUk") SELECT "createdAt", "id", "name", "published", "rating", "serviceId", "textEn", "textUk" FROM "Review";
DROP TABLE "Review";
ALTER TABLE "new_Review" RENAME TO "Review";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
