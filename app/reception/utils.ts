export function formatExpiry(date: string | null) {
  if (!date) return "No expiry";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function timeLeft(endsAt: string, tick: number) {
  const remaining = new Date(endsAt).getTime() - tick;

  if (remaining <= 0) return "Complete";

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}