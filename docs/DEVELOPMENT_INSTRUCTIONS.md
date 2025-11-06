# Development Instructions - uitdeitp-app-standalone

**Date:** 2025-11-04
**Status:** Active Development Protocol

---

## 🎯 Core Development Philosophy

**"Completează tot până termini. Nu întreba - folosește hive mind orchestrator cu logică bizantină."**

### Decision-Making Protocol

1. **Primary Strategy:** Byzantine consensus cu hive mind orchestration
2. **Research Tool:** god-cli pentru cercetare și clarificări
3. **Consensus:** Când apar întrebări, god-cli și orchestratorul decid împreună soluția cea mai corectă
4. **Goal:** Produs finit, complet implementat

---

## 🧠 Orchestration Architecture

### Byzantine Hive Mind Setup

**Topology:** Hierarchical with Byzantine fault tolerance
- **Queen Coordinator:** Strategic decisions și resource allocation
- **Specialized Workers:** Parallel execution pe domenii
- **Consensus Mechanism:** Byzantine agreement pentru decizii critice
- **god-cli Integration:** Research și validation partner

### Agent Coordination Pattern

```bash
# Initialize Byzantine-tolerant hive
npx claude-flow@alpha swarm init --topology hierarchical --consensus byzantine

# Spawn specialized workers
npx claude-flow@alpha agent spawn --type researcher  # god-cli integration
npx claude-flow@alpha agent spawn --type coder      # Implementation
npx claude-flow@alpha agent spawn --type tester     # Quality assurance
npx claude-flow@alpha agent spawn --type reviewer   # Code review

# Coordinate with Byzantine consensus
npx claude-flow@alpha task orchestrate --strategy adaptive
```

---

## 📋 Development Phases Status

### ✅ FAZA 1: Database & Backend (100%)
- Database migration (006_prd_schema_migration.sql)
- API endpoints (/api/reminders, /api/users, /api/stations)
- NotifyHub client integration
- Security audit (0 P0 vulnerabilities)
- Backend test suite (130+ test cases)

### ✅ FAZA 2: Authentication & UI (100%)
- Auth pages (register, login, reset, verify)
- OAuth implementation (Google, GitHub)
- Profile management pages
- Settings page (4 tabs)
- Reusable UI components (15+)
- P0 fixes and security improvements
- **All P0 blockers resolved**
- **No deprecated code used (verified with god-cli)**

### ⏳ FAZA 3: Dashboard CRUD (In Progress)
**Target:** Complete reminders management with real-time updates

**Components to Implement:**
1. RemindersList component (table/card view)
2. AddReminderDialog (modal with form)
3. EditReminderDialog (edit existing reminders)
4. DeleteReminderModal (confirmation dialog)
5. Filters (status, type, station, date range)
6. Search functionality
7. Real-time updates (Supabase Realtime)
8. NotifyHub SMS integration
9. Optimistic UI updates
10. Toast notifications

**Estimated Time:** 2-3 weeks

---

## 🔧 Current P1 Tasks (Before FAZA 3)

### 1. Console.log Cleanup (6 instances)
- API routes (3): `/api/reminders`, `/api/users`, `/api/stations`
- NotifyHub client (3): `src/lib/notifyhub/client.ts`
- Integration examples (2): Examples folder

**Action:** Replace with `logger.error()` / `logger.info()`

### 2. React Hooks Dependencies (6 instances)
- Settings tabs (3): `fetchStationData`
- Kiosk pages (3): `loadSettings`, `loadProfile`

**Action:** Add `useCallback` wrappers

### 3. Image Optimization (2 instances)
- KioskLayout logo
- StationBranding logo

**Action:** Migrate to `next/image`

### 4. Unescaped Entities (2 instances)
- AccountTab.tsx line 155

**Action:** Escape quotes or use proper entities

### 5. TypeScript Improvements
- Replace `Record<string, any>` with `Record<string, unknown>`
- Add proper interfaces where possible

---

## 🚀 Implementation Strategy

### Phase 1: P1 Fixes (Est. 2-3 hours)
**Parallel execution with Byzantine consensus:**

1. **Coder Agent:** Fix console.log statements
2. **Coder Agent:** Fix React hooks
3. **Coder Agent:** Migrate to next/image
4. **Coder Agent:** Fix TypeScript types
5. **Reviewer Agent:** Code review all changes
6. **Tester Agent:** Verify no regressions

**Consensus Check:** god-cli validates best practices

### Phase 2: FAZA 3 Architecture (Est. 4 hours)
**god-cli research + Byzantine consensus:**

1. **Research Agent (god-cli):** Best practices pentru:
   - Supabase Realtime subscriptions
   - Optimistic UI updates
   - Complex form handling
   - Filter/search patterns
   - SMS integration patterns

2. **Architect Agent:** Design system architecture:
   - Component structure
   - State management
   - API integration
   - Real-time updates flow
   - Error handling strategy

3. **Consensus:** Byzantine vote pe arhitectură finală

### Phase 3: FAZA 3 Implementation (Est. 1.5-2 weeks)
**Specialized worker agents:**

1. **Frontend Agent:** UI components
   - RemindersList (table + pagination)
   - CRUD dialogs (Add/Edit/Delete)
   - Filters component
   - Search component

2. **Integration Agent:** Backend connections
   - API client functions
   - Supabase Realtime setup
   - NotifyHub SMS integration
   - Error handling

3. **State Agent:** State management
   - Optimistic updates
   - Real-time sync
   - Local state management
   - Cache invalidation

4. **Test Agent:** Comprehensive testing
   - Component tests
   - Integration tests
   - E2E tests
   - Manual QA scenarios

### Phase 4: Testing & Deployment (Est. 3-4 days)
1. **Integration testing**
2. **Performance testing**
3. **Security audit**
4. **Production deployment**
5. **Monitoring setup**

---

## 🧪 Testing Requirements

### Before Each Phase:
- [ ] All tests pass (`npm run test`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)

### Before FAZA 3 Completion:
- [ ] Manual OAuth testing (Google + GitHub)
- [ ] All CRUD operations work
- [ ] Real-time updates functional
- [ ] SMS notifications sent correctly
- [ ] Filters and search work
- [ ] Mobile responsive
- [ ] Accessibility (WCAG 2.1 AA)

---

## 🎯 Success Criteria

**FAZA 3 is complete when:**

1. ✅ All P1 issues fixed
2. ✅ RemindersList component functional
3. ✅ Add/Edit/Delete dialogs work
4. ✅ Filters and search operational
5. ✅ Real-time updates working
6. ✅ NotifyHub SMS integration tested
7. ✅ Optimistic UI updates smooth
8. ✅ Error handling comprehensive
9. ✅ All tests passing (>90% coverage)
10. ✅ Production ready (no P0/P1 issues)

**Final Deliverable:** Fully functional reminder management dashboard with real-time updates and SMS notifications.

---

## 📞 Key Contacts

- **Project:** uitdeitp-app-standalone
- **Supabase Project:** dnowyodhffqqhmakjupo
- **NotifyHub Integration:** Active
- **Deployment:** TBD (Vercel/Railway)

---

## 🔒 Security Reminders

1. Never hardcode API keys or secrets
2. Always validate user input
3. Use logger utility (not console.log)
4. Check for SQL injection vulnerabilities
5. Prevent XSS attacks
6. Validate OAuth redirects
7. Rate limit API endpoints
8. Use HTTPS in production

---

**Created:** 2025-11-04
**Last Updated:** 2025-11-04
**Status:** Active - FAZA 2 Complete, FAZA 3 In Progress
**Orchestration:** Byzantine Hive Mind with god-cli consensus
