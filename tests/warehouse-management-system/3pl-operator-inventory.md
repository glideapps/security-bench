# Description
3PL operator viewing inventory across their assigned facilities

# Vulnerability Testing Notes
This query tests whether 3PL operators can only view inventory for clients with ACTIVE contracts.
- Parameter 1: Tests with org-3 which has an INACTIVE contract (should return nothing in good queries, but data in -04-bad)
- Parameter 2: Tests with org-4 which has an EXPIRED contract (valid_to < today, should be blocked)  
- Parameter 3: Tests with org-2 which has an INACTIVE contract at facility-2
- Parameter 4: Control case with org-1 which has an ACTIVE contract (should work normally)
- Parameter 5: Tests with NULL contract org (should return nothing)
- Parameter 6: Tests with expired contract org (should return nothing)
- Parameter 7: CRITICAL - Tests cross-3PL access: Global Logistics user at FastShip facility (should fail in good, succeed in -05-bad)

The -03-bad query has SQL injection vulnerability via client_org_filter.
The -04-bad query ignores contract validity dates and active status, exposing inventory for expired contracts.
The -05-bad query doesn't check facility ownership, allowing access to other 3PL's facilities.
The -06-bad query has incorrect secure zone logic.

# Parameters

{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "client_org_filter": "org-22222222-0000-0000-0000-000000000003", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000004", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "client_org_filter": "org-22222222-0000-0000-0000-000000000004", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "facility_id": "fac-55555555-0000-0000-0000-000000000002", "client_org_filter": "org-22222222-0000-0000-0000-000000000002", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "client_org_filter": "org-22222222-0000-0000-0000-000000000001", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "client_org_filter": "org-99999999-edge-null", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "client_org_filter": "org-edge-expired", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "facility_id": "fac-55555555-0000-0000-0000-000000000004", "client_org_filter": "org-22222222-0000-0000-0000-000000000002", "limit": 10, "offset": 0 }