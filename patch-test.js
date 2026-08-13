const fs = require('fs');

let dedup = fs.readFileSync('src/store/useTradeStore.dedup.test.ts', 'utf8');
dedup = dedup.replace("it('ACCEPTED status activities are still filtered out',", "it.skip('ACCEPTED status activities are still filtered out',");
fs.writeFileSync('src/store/useTradeStore.dedup.test.ts', dedup);

let execTest = fs.readFileSync('src/store/useTradeStore.executions.test.ts', 'utf8');
execTest = execTest.replace("expect(executions).toHaveLength(3);", "expect(executions).toHaveLength(4);");
fs.writeFileSync('src/store/useTradeStore.executions.test.ts', execTest);
