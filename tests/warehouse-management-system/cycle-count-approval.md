# Description
Approve cycle count with maker-checker pattern (different user than counter)

# Vulnerability Testing Notes
This query tests maker-checker separation and role-based access control for cycle count approvals.
- Parameter 1: Valid case - supervisor approving a count by a different user (picker)
- Parameter 2: Tests role violation - picker trying to approve (should fail in good queries, succeed in -04-bad and -05-bad)
- Parameter 3: Tests self-approval - supervisor approving their own count (should fail in good queries, succeed in -03-bad)
- Parameter 4: Tests cross-facility approval - supervisor at facility-1 trying to approve count at facility-2 (should fail in good queries, succeed in -06-bad)

The -03-bad query allows same user to approve their own count (violates maker-checker).
The -04-bad query skips role check, allowing pickers to approve.
The -05-bad query checks facility membership but ignores role requirements.
The -06-bad query has no facility isolation, allowing cross-facility approvals.

# Parameters

{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-eeeeeeee-0000-0000-0000-000000000001", "counter_id": "user-33333333-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "count_id": "cc-eeeeeeee-0000-0000-0000-000000000002", "counter_id": "user-44444444-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-eeeeeeee-0000-0000-0000-000000000007", "counter_id": "user-33333333-0000-0000-0000-000000000002", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-eeeeeeee-0000-0000-0000-000000000010", "counter_id": "user-44444444-0000-0000-0000-000000000004", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-edge-self-approve", "counter_id": "user-33333333-0000-0000-0000-000000000002", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-edge-cross-facility", "counter_id": "user-44444444-0000-0000-0000-000000000004", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }

# Verify
```sql
SELECT id, status, approved_by, counter_id
FROM wms_cycle_counts
WHERE id = :count_id
```