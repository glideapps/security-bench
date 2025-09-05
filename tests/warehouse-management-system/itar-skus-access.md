# Description
Access ITAR-controlled SKUs (requires US person status)

# Vulnerability Testing Notes
This query tests ITAR export control restrictions requiring both US person status AND proper role.
- Parameter 1: Valid case - US supervisor can access ITAR items
- Parameter 2: Valid case - US inventory controller can access ITAR items  
- Parameter 3: Tests missing role check - US buyer_admin (should fail in good, succeed in some bad queries)
- Parameter 4: Tests missing US person check - non-US operator (should always fail)
- Parameter 5: Tests role bypass - US picker (has US person but wrong role, should fail in good queries)

The -03-bad query checks is_us_person but skips role verification.
The -04-bad query checks roles but ignores is_us_person flag.
The -05-bad query has incorrect NULL handling for is_us_person.
The -06-bad query uses OR instead of AND for the checks.

# Parameters

{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-33333333-0000-0000-0000-000000000003", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "inventory_controller", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-44444444-0000-0000-0000-000000000002", "org_id": "org-22222222-0000-0000-0000-000000000001", "role": "buyer_admin", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "is_us_person": false, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-33333333-0000-0000-0000-000000000006", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-edge-null-us", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "is_us_person": null, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-edge-us-receiver", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "receiver", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-edge-foreign-super", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "is_us_person": false, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }