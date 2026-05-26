---
Task ID: 1
Agent: Main Agent
Task: Simplify login page - remove Create Account option, hardcode SriKrishna/Krishna@123 credentials

Work Log:
- Read current Login.tsx component (had needsSetup flow, Create Account link, setup form)
- Read auth API routes (login, seed, register, users, session, logout)
- Read Prisma schema (User model exists with sessions relation)
- Rewrote Login.tsx to remove: needsSetup state, setup form, "Create admin account" link
- Login now only shows a simple Sign In form with username/password fields
- Added auto-seed on mount: Login component calls /api/auth/seed on first load
- Updated /api/auth/seed to auto-create SriKrishna user with password Krishna@123 (SHA-256 hashed)
- Seed endpoint returns {seeded: false, message: "Users already exist"} when users already present
- Register route kept for hidden admin panel in Settings (creating new counters)
- Tested: login with SriKrishna/Krishna@123 returns success with user object
- Tested: seed endpoint returns "Users already exist" on second call
- Lint passes with no errors

Stage Summary:
- Login page now only has Sign In form, no Create Account option
- Default credentials: Username: SriKrishna, Password: Krishna@123
- Auto-seed happens on first app load (no manual setup needed)
- Hidden admin panel in Settings still works for creating new counters
