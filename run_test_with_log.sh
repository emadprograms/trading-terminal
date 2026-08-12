sed -i '' 's/let matchBar = chartData\[0\];/console.log("chartData[0]: ", chartData[0]); let matchBar = chartData[0];/' src/hooks/useTradeManager.ts
npx playwright test tests/e2e/historical-markers.spec.ts
sed -i '' 's/console.log("chartData\[0\]: ", chartData\[0\]); //' src/hooks/useTradeManager.ts
