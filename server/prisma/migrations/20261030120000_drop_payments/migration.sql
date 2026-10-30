-- Передоплату прибрано: запис тепер підтверджує сам пацієнт у Telegram-боті (pending_client).

-- Брони, що ще чекали оплати, скасовуємо й звільняємо їхні слоти.
UPDATE "Slot" SET "booked" = false
WHERE "id" IN (SELECT "slotId" FROM "Booking" WHERE "status" = 'pending_payment' AND "slotId" IS NOT NULL);
UPDATE "Booking" SET "status" = 'canceled', "slotId" = NULL, "holdUntil" = NULL
WHERE "status" = 'pending_payment';

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Payment";
PRAGMA foreign_keys=on;
