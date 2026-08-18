import fs from 'fs';

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

// Add Bell and AlertsPanel imports
if (!sidebar.includes('import { AlertsPanel }')) {
  sidebar = sidebar.replace("import { toast } from 'sonner';", "import { toast } from 'sonner';\nimport { AlertsPanel } from './AlertsPanel';");
}
sidebar = sidebar.replace("Check } from 'lucide-react';", "Check, Bell } from 'lucide-react';");

// Fix useState type
sidebar = sidebar.replace(
  "useState<'watchlist' | 'tradeLog' | 'orderHistory' | null>",
  "useState<'watchlist' | 'tradeLog' | 'orderHistory' | 'alerts' | null>"
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
