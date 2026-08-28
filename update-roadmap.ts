import fs from 'fs';
let roadmap = fs.readFileSync('.planning/ROADMAP.md', 'utf-8');

// The roadmap headers do not have checkboxes! The tasks have checkboxes.
// The phases themselves are represented by ### Phase X: Title
// But autonomous script parses them via init.manager which checks STATE.md or similar.
