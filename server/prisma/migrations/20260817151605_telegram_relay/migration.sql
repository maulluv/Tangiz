-- CreateTable
CREATE TABLE "TelegramRelay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerMsgId" INTEGER NOT NULL,
    "chatId" TEXT NOT NULL,
    "fromName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramRelay_ownerMsgId_key" ON "TelegramRelay"("ownerMsgId");
