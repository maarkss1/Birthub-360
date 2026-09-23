# Dispatch Contract

Task ID:
Objective:
Allowed scope:
Forbidden scope:
Dependencies:
Acceptance:
Evidence:
Tests:
Rollback:
Next dependency:

### Parallel execution check

Before dispatch, Coordinator must confirm:

- ownership disjoint;
- no schema migration conflict;
- no shared hot-file conflict;
- dependencies green;
- security gate permits;
- rollback understood.
