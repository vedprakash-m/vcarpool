# Authentication Endpoint Migration Plan

## Overview

This document outlines the step-by-step migration from fragmented authentication endpoints to the unified `/api/auth` endpoint. The migration maintains backward compatibility during transition and provides a clear path to the new unified system.

## Current State Analysis

### Existing Authentication Endpoints

Currently active endpoints that need migration:

1. **`/api/auth-login-simple`** - Primary login endpoint used by e2e tests
2. **`/api/auth-register-working`** - Primary registration endpoint
3. **`/api/auth-refresh-token`** - Token refresh functionality
4. **`/api/auth-unified-secure`** - Partially implemented unified auth
5. **`/api/auth-entra-unified`** - Entra ID integration
6. Various other auth endpoints in different states

### Endpoint Usage Analysis

From codebase analysis:

- **E2E Tests:** Heavily use `auth-login-simple` (21+ references)
- **Frontend:** References to legacy endpoints in store files
- **Integration Tests:** May have dependencies on specific endpoint names

## Migration Strategy

### Phase 1: Parallel Deployment (Completed ✅)

- ✅ Created unified `/api/auth` endpoint
- ✅ Implemented all authentication actions (login, register, refresh, etc.)
- ✅ Created authentication middleware for protected endpoints
- ✅ Maintained full backward compatibility
- ✅ Added comprehensive API documentation

### Phase 2: Frontend Migration (Next Steps)

#### 2.1 Update Frontend Authentication Store

**File:** `frontend/src/store/trip.store.ts` and related auth stores

**Changes Needed:**

```typescript
// OLD
const loginResponse = await fetch('/api/auth-login-simple', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// NEW
const loginResponse = await fetch('/api/auth?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

#### 2.2 Update Frontend Service Classes

**Files to Update:**

- `frontend/src/services/auth.service.ts`
- `frontend/src/services/api.service.ts`
- Any authentication-related service files

### Phase 3: E2E Test Migration

#### 3.1 Update Test Helper Functions

**File:** `e2e/specs/*.spec.ts` (21+ files to update)

**Current Pattern:**

```typescript
const parentLoginResponse = await makeApiRequest(request, 'POST', '/api/auth-login-simple', {
  email: 'parent@example.com',
  password: 'password123',
});
```

**New Pattern:**

```typescript
const parentLoginResponse = await makeApiRequest(request, 'POST', '/api/auth?action=login', {
  email: 'parent@example.com',
  password: 'password123',
});
```

#### 3.2 Create Migration Script

```bash
#!/bin/bash
# migrate-e2e-tests.sh

echo "Migrating E2E tests to unified auth endpoint..."

# Update all e2e test files
find e2e/specs -name "*.spec.ts" -exec sed -i '' 's|/api/auth-login-simple|/api/auth?action=login|g' {} \;
find e2e/specs -name "*.spec.ts" -exec sed -i '' 's|/api/auth-register-working|/api/auth?action=register|g' {} \;
find e2e/specs -name "*.spec.ts" -exec sed -i '' 's|/api/auth-refresh-token|/api/auth?action=refresh|g' {} \;

echo "E2E test migration completed!"
```

### Phase 4: Backend Function Migration

#### 4.1 Create Backward Compatibility Wrappers

For gradual migration, create lightweight wrappers that redirect to unified endpoint:

**Example:** `auth-login-simple/index.ts` (wrapper)

```typescript
import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authUnified } from '../src/functions/auth-unified';

export async function authLoginSimple(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  context.log('Legacy auth-login-simple called, redirecting to unified auth');

  // Add action parameter and redirect to unified endpoint
  const newRequest = {
    ...request,
    query: new URLSearchParams('action=login'),
  };

  return await authUnified(newRequest, context);
}
```

#### 4.2 Update Function Registrations

**File:** `backend/host.json` or deployment configuration

Add the new unified endpoint while maintaining legacy endpoints for transition period.

### Phase 5: Validation and Testing

#### 5.1 Comprehensive Testing Checklist

- [ ] **Unit Tests:** All authentication flows work correctly
- [ ] **Integration Tests:** Frontend-backend integration functional
- [ ] **E2E Tests:** All user scenarios pass with new endpoints
- [ ] **Security Tests:** JWT validation, token refresh, password reset
- [ ] **Performance Tests:** Response times comparable to legacy endpoints
- [ ] **Error Handling:** All error scenarios properly handled

#### 5.2 Monitoring and Metrics

Set up monitoring for:

- Authentication success/failure rates
- Response times for auth operations
- Error patterns and frequency
- Token validation performance

### Phase 6: Legacy Cleanup (Final Phase)

#### 6.1 Remove Legacy Endpoints

**Files to Remove:**

```
backend/auth-login-simple/
backend/auth-register-working/
backend/auth-unified-secure/
backend/auth-entra-unified/
backend/auth-refresh-token/
backend/auth-token-v1/
```

#### 6.2 Clean Up Imports and References

Search and remove references to legacy authentication services:

```bash
# Find remaining references
grep -r "auth-login-simple" --exclude-dir=node_modules .
grep -r "authService" --exclude-dir=node_modules .
grep -r "SecureAuthService" --exclude-dir=node_modules .
```

#### 6.3 Update Documentation

- Update API documentation
- Update deployment guides
- Update developer onboarding docs
- Update troubleshooting guides

## Timeline

| Phase                         | Duration     | Dependencies |
| ----------------------------- | ------------ | ------------ |
| Phase 1: Parallel Deployment  | ✅ Completed | -            |
| Phase 2: Frontend Migration   | 1-2 days     | Phase 1      |
| Phase 3: E2E Test Migration   | 1 day        | Phase 2      |
| Phase 4: Backend Migration    | 1 day        | Phase 3      |
| Phase 5: Validation & Testing | 2-3 days     | Phase 4      |
| Phase 6: Legacy Cleanup       | 1 day        | Phase 5      |

**Total Estimated Time:** 6-8 days

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback:** Revert to legacy endpoints by updating frontend calls
2. **Partial Rollback:** Keep both systems running in parallel
3. **Issue Resolution:** Fix issues in unified endpoint and re-migrate
4. **Communication:** Notify team of rollback and timeline for re-migration

## Success Criteria

Migration is considered successful when:

- [ ] All authentication flows work through unified endpoint
- [ ] All E2E tests pass
- [ ] Frontend authentication fully functional
- [ ] Response times maintained or improved
- [ ] Zero critical security issues
- [ ] Legacy endpoints safely removed
- [ ] Documentation updated and accurate

## Risk Mitigation

1. **Backup Strategy:** Maintain legacy endpoints during transition
2. **Incremental Migration:** Migrate one component at a time
3. **Comprehensive Testing:** Test each migration step thoroughly
4. **Monitoring:** Track metrics throughout migration
5. **Team Communication:** Keep stakeholders informed of progress

## Next Steps

1. **Immediate:** Begin Phase 2 (Frontend Migration)
2. **Priority:** Update E2E tests to use new endpoint
3. **Communication:** Notify team of unified endpoint availability
4. **Documentation:** Share API documentation with frontend team
