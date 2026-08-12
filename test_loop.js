const chartData = [
  { time: 1000 },
  { time: 2000 },
  { time: 3000 },
  { time: 4000 }
];
const e = { timestamp: 2500000 }; // 2500 * 1000

let matchBar = chartData[0];
let matchBarTimeMs = 0;

for (const bar of chartData) {
  let barTimeMs = bar.time * 1000;
  
  if (barTimeMs <= e.timestamp) {
    matchBar = bar;
    matchBarTimeMs = barTimeMs;
  } else {
    break;
  }
}
console.log({ matchBar, matchBarTimeMs, time: Math.floor(matchBarTimeMs / 1000) });
