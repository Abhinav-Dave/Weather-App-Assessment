export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("404") || msg.toLowerCase().includes("location not found") || msg.toLowerCase().includes("not found")) {
    return "We couldn't find that city. Check spelling or try a nearby city.";
  }
  if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
    return "Too many requests. Wait a moment and try again.";
  }
  if (msg.includes("401")) {
    return "API key issue — check the backend configuration.";
  }
  if (msg.includes("502") || msg.includes("503")) {
    return "The weather service is unreachable right now. Try again shortly.";
  }
  if (msg.toLowerCase().includes("network error") || msg.toLowerCase().includes("econnrefused") || msg.toLowerCase().includes("backend")) {
    return "Can't reach the server. Is the backend running on :8000?";
  }
  if (msg.toLowerCase().includes("timeout")) {
    return "Request timed out. Check your connection and try again.";
  }

  return msg;
}