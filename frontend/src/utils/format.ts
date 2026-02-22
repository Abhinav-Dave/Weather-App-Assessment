export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  // Append 'Z' so the browser treats it as UTC and converts to local time
  const utc = iso.endsWith("Z") ? iso : iso + "Z";
  return new Date(utc).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°C`;
}