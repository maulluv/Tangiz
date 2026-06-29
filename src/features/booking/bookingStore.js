const KEY = "tangiz.bookings";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getBookings(userId) {
  return readAll()
    .filter((b) => b.userId === userId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function addBooking(b) {
  const booking = {
    ...b,
    id: crypto.randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), booking]);
  return booking;
}

export function cancelBooking(id) {
  writeAll(
    readAll().map((b) => (b.id === id ? { ...b, status: "canceled" } : b)),
  );
}
