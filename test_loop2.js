// If missing Z, it shifts 3 hours (in +3 timezone)
const d1 = new Date("2024-08-12T10:05:00").getTime();
// Correct UTC
const d2 = new Date("2024-08-12T10:05:00Z").getTime();
console.log({ d1, d2, diff: (d2 - d1) / 3600000 });
