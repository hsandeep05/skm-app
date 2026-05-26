---
Task ID: 1
Agent: Main Agent
Task: Multiple UI fixes and feature additions

Work Log:
- Made Cost Price field masked (password type) by default with Eye/EyeOff toggle to reveal in billing.tsx
- Added visibleCostPrices state (Set<string>) to track which cost price fields are unmasked
- Fixed mobile view dashboard metric cards - smaller padding, font sizes on mobile, responsive grid
- Fixed MetricCard component: p-3 sm:p-5, text-lg sm:text-3xl, h-9 w-9 sm:h-12 sm:w-12 icons
- Added "Clear All Data" section in Settings with admin password confirmation
- Created /api/clear-data endpoint to delete all invoices, items, and reset counters
- Added "Sticky Bottom Bar" toggle in Settings (mobile only) with on/off button
- Updated page.tsx to support stickyBottomBar state and pass to Settings
- Mobile bottom bar now uses stickyBottomBar state: fixed when on, sticky when off
- Cleared all existing test data from the database (invoices, items, counters all deleted)
- Hidden admin panel still accessible via 5-tap on version number for adding new counters
- Lint passes with no errors

Stage Summary:
- Cost Price fields are now masked like passwords by default, with eye toggle to show/hide
- Mobile view cards properly sized with responsive breakpoints
- Clear All Data option added in Settings (requires admin password)
- Sticky Bottom Bar toggle added in Settings (mobile only)
- All test data cleared - fresh start from zero
