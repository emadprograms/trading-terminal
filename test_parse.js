const isoStr = "2024-01-01T08:00:00.000Z";
console.log(new Date(isoStr).getTime() / 1000);
console.log(new Date("2024-01-01T00:00:00Z").getTime() / 1000);
