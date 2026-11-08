-- Назву бренду виправлено: TANGIZ → TENGIZ (як ім'я лікаря, Тенгіз).
-- Чіпаємо лише стару назву за замовчуванням — якщо власник уже вписав свою, лишаємо її.
UPDATE "ClinicProfile" SET "name" = 'TENGIZ' WHERE "name" = 'TANGIZ';
