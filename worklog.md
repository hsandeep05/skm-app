---
Task ID: 1
Agent: Main Agent
Task: Move Clear All Data to hidden admin, add logo option, hide floating preview button

Work Log:
- Removed floating Eye/preview button from billing.tsx mobile view
- Moved "Clear All Data" section inside the hidden admin panel (5-tap to unlock)
- Clear All Data still requires admin password confirmation before deleting
- Added Setting model to Prisma schema (key-value store for app settings)
- Created /api/logo API endpoint (GET, POST, DELETE) for shop logo management
- Added "Shop Logo" upload section inside hidden admin panel in Settings
  - Upload image (max 500KB, any image format)
  - Preview with remove button
  - Logo stored as base64 in database via Setting model
- Updated InvoicePreview to accept and display shopLogo in invoice header
- Updated Billing, Dashboard, PendingBills components to pass shopLogo to invoice previews
- Added shopLogo state management in page.tsx with onLogoChange callback
- All lint checks pass

Stage Summary:
- Floating preview button removed from mobile billing view
- Clear All Data is now hidden behind 5-tap admin unlock + requires password
- Shop Logo upload available in hidden admin panel (appears on invoices)
- Logo stored in database, loaded on app startup
