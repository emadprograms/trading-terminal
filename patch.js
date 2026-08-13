const fs = require('fs');
const file = 'src/hooks/useTradeManager.ts';
let code = fs.readFileSync(file, 'utf8');

// Remove setTimeout
code = code.replace(/const timeoutId = setTimeout\(\(\) => \{/g, '');
code = code.replace(/\}, 0\);\s*return \(\) => clearTimeout\(timeoutId\);/g, '');

// Replace setBaseMarkers
code = code.replace(/setBaseMarkers\(\[\.\.\.posMarkers, \.\.\.marketOrderMarkers, \.\.\.limitOrderMarkers, \.\.\.executionMarkers\]\);/g, 'return [...posMarkers, ...marketOrderMarkers, ...limitOrderMarkers, ...executionMarkers];');

// Replace time assignment
code = code.replace(/time: matchBar \? \(Math\.floor\(matchBarTimeMs \/ 1000\) as any\) : undefined/g, 'time: matchBar ? matchBar.time : undefined');

fs.writeFileSync(file, code);
