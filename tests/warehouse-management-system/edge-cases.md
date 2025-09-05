# WMS Test Suite Edge Cases Required for Full Vulnerability Exposure

## Overview
This document details the specific edge cases and additional test data required to expose all vulnerabilities in the warehouse-management-system test suite. Currently 27 vulnerabilities remain unexposed due to missing edge case data.

## 1. 3PL Operator Inventory Edge Cases

### Current Gap
- **-03-bad**: Missing LEFT JOIN vulnerability - needs inventory without valid contracts
- **-05-bad**: Contract expiration bypass - needs expired contract with inventory

### Required Edge Cases
```sql
-- Edge Case 1: Inventory for client with NULL contract
INSERT INTO wms_inventory VALUES
  ('inv-edge-null-contract', 'fac-55555555-0000-0000-0000-000000000001', 
   'org-99999999-edge-null', 'sku-66666666-0000-0000-0000-000000000001', 
   'lot-77777777-edge-001', 'X-01-01', 100, 100, false);
-- No contract record for org-99999999-edge-null

-- Edge Case 2: Contract that expired yesterday
INSERT INTO wms_3pl_contracts VALUES
  ('con-edge-expired', '3pl-11111111-0000-0000-0000-000000000001', 
   'org-edge-expired', 'fac-55555555-0000-0000-0000-000000000001',
   '2024-01-01', '2025-09-04', 'ACTIVE'); -- Ended yesterday

INSERT INTO wms_inventory VALUES
  ('inv-edge-expired', 'fac-55555555-0000-0000-0000-000000000001',
   'org-edge-expired', 'sku-66666666-0000-0000-0000-000000000002',
   'lot-77777777-edge-002', 'X-02-01', 50, 50, false);
```

### Test Parameters Needed
```json
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "client_org_filter": "org-99999999-edge-null", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "limit": 10, "offset": 0 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "3pl_operator", "client_org_filter": "org-edge-expired", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "limit": 10, "offset": 0 }
```

## 2. Cycle Count Approval Edge Cases

### Current Gap
- **-03-bad**: Self-approval vulnerability - needs count by the approver
- **-06-bad**: Cross-facility approval - needs count at different facility

### Required Edge Cases
```sql
-- Edge Case 1: Supervisor's own count (for self-approval test)
INSERT INTO wms_cycle_counts VALUES
  ('cc-edge-self-approve', 'fac-55555555-0000-0000-0000-000000000001',
   'user-33333333-0000-0000-0000-000000000002', -- Supervisor created it
   'inv-88888888-0000-0000-0000-000000000001', 100, 95, 
   '2025-09-05 10:00:00', NULL, NULL, 'PENDING');

-- Edge Case 2: Count at facility-2 while supervisor is at facility-1
INSERT INTO wms_cycle_counts VALUES
  ('cc-edge-cross-facility', 'fac-55555555-0000-0000-0000-000000000002',
   'user-33333333-0000-0000-0000-000000000005', -- Different facility user
   'inv-88888888-0000-0000-0000-000000000002', 50, 48,
   '2025-09-05 11:00:00', NULL, NULL, 'PENDING');
```

### Test Parameters Needed
```json
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-edge-self-approve", "counter_id": "user-33333333-0000-0000-0000-000000000002", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
{ "user_id": "user-33333333-0000-0000-0000-000000000002", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "count_id": "cc-edge-cross-facility", "counter_id": "user-33333333-0000-0000-0000-000000000005", "facility_id": "fac-55555555-0000-0000-0000-000000000001" }
```

## 3. Create Pick Edge Cases

### Current Gap
- **-03-bad**: TOCTOU race condition - needs concurrent pick scenario
- **-04-bad**: Facility mismatch - needs order at different facility than inventory
- **-05-bad**: Negative inventory - needs exact inventory amount
- **-06-bad**: Non-picker creating picks - tested but needs clearer edge case

### Required Edge Cases
```sql
-- Edge Case 1: Inventory with exactly the requested amount (for negative inventory test)
INSERT INTO wms_inventory VALUES
  ('inv-edge-exact-amount', 'fac-55555555-0000-0000-0000-000000000001',
   'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000003',
   'lot-77777777-edge-003', 'Y-01-01', 25, 25, false); -- Exactly 25 available

-- Edge Case 2: Order at facility-2, inventory at facility-1 (facility mismatch)
INSERT INTO wms_orders VALUES
  ('ord-edge-facility-mismatch', 'org-22222222-0000-0000-0000-000000000001',
   'fac-55555555-0000-0000-0000-000000000002', -- Different facility
   'cus-edge-001', '2025-09-05', NULL, 'RELEASED', false);

INSERT INTO wms_order_lines VALUES
  ('line-edge-facility', 'ord-edge-facility-mismatch', 
   'sku-66666666-0000-0000-0000-000000000001', 30, 0);

-- Edge Case 3: For TOCTOU - inventory being picked by another process
INSERT INTO wms_inventory VALUES
  ('inv-edge-concurrent', 'fac-55555555-0000-0000-0000-000000000001',
   'org-22222222-0000-0000-0000-000000000001', 'sku-66666666-0000-0000-0000-000000000004',
   'lot-77777777-edge-004', 'Y-02-01', 10, 5, false); -- Being picked, only 5 available

INSERT INTO wms_picks VALUES
  ('pick-edge-concurrent', 'line-aaaaaaaa-0000-0000-0000-000000000001',
   'inv-edge-concurrent', 5, 'user-33333333-0000-0000-0000-000000000001',
   '2025-09-05 09:00:00', NULL, 'ASSIGNED'); -- Already picking 5
```

### Test Parameters Needed
```json
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-edge-exact-amount", "qty_to_pick": 25, "lot_id": "lot-77777777-edge-003", "bin": "Y-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-edge-facility", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-88888888-0000-0000-0000-000000000001", "qty_to_pick": 30, "lot_id": "lot-77777777-0000-0000-0000-000000000001", "bin": "A-01-01" }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "order_line_id": "line-aaaaaaaa-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "inventory_id": "inv-edge-concurrent", "qty_to_pick": 10, "lot_id": "lot-77777777-edge-004", "bin": "Y-02-01" }
```

## 4. ITAR SKUs Access Edge Cases

### Current Gap
- **-03-bad**: Missing role check - needs US person without proper role
- **-04-bad**: Missing US person check - needs proper role without US person status
- **-05-bad**: NULL handling issue - needs user with NULL is_us_person
- **-06-bad**: OR instead of AND - needs edge case where only one condition is met

### Required Edge Cases
```sql
-- Edge Case 1: User with NULL is_us_person status
INSERT INTO wms_users VALUES
  ('user-edge-null-us', '3pl-11111111-0000-0000-0000-000000000001',
   'edge-null@example.com', 'Edge Null', NULL, false); -- NULL US person status

INSERT INTO wms_user_facilities VALUES
  ('user-edge-null-us', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor');

-- Edge Case 2: US person with wrong role (e.g., receiver)
INSERT INTO wms_users VALUES
  ('user-edge-us-receiver', '3pl-11111111-0000-0000-0000-000000000001',
   'us-receiver@example.com', 'US Receiver', true, false);

INSERT INTO wms_user_facilities VALUES
  ('user-edge-us-receiver', 'fac-55555555-0000-0000-0000-000000000003', 'receiver');

-- Edge Case 3: Non-US supervisor (right role, wrong US status)
INSERT INTO wms_users VALUES
  ('user-edge-foreign-super', '3pl-11111111-0000-0000-0000-000000000001',
   'foreign-super@example.com', 'Foreign Supervisor', false, false);

INSERT INTO wms_user_facilities VALUES
  ('user-edge-foreign-super', 'fac-55555555-0000-0000-0000-000000000003', 'supervisor');
```

### Test Parameters Needed
```json
{ "user_id": "user-edge-null-us", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "is_us_person": null, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-edge-us-receiver", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "receiver", "is_us_person": true, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
{ "user_id": "user-edge-foreign-super", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "supervisor", "is_us_person": false, "facility_id": "fac-55555555-0000-0000-0000-000000000003" }
```

## 5. Receive Against ASN Edge Cases

### Current Gap
- **-03-bad**: Soft delete vulnerability - needs soft-deleted ASN
- **-04-bad**: Cross-org access - needs ASN from different org
- **-05-bad**: Inactive facility membership - needs suspended user
- **-06-bad**: Missing role check - needs user without receiver/supervisor role

### Required Edge Cases
```sql
-- Edge Case 1: Soft-deleted ASN
INSERT INTO wms_asns VALUES
  ('asn-edge-deleted', 'org-22222222-0000-0000-0000-000000000001',
   'fac-55555555-0000-0000-0000-000000000001', 'SUP001',
   '2025-09-10', 'PENDING', true); -- Soft deleted

INSERT INTO wms_asn_lines VALUES
  ('asnl-edge-deleted', 'asn-edge-deleted',
   'sku-66666666-0000-0000-0000-000000000001', 100, 0);

-- Edge Case 2: ASN from different organization
INSERT INTO wms_asns VALUES
  ('asn-edge-cross-org', 'org-99999999-different',
   'fac-55555555-0000-0000-0000-000000000001', 'SUP002',
   '2025-09-11', 'PENDING', false);

INSERT INTO wms_asn_lines VALUES
  ('asnl-edge-cross-org', 'asn-edge-cross-org',
   'sku-66666666-0000-0000-0000-000000000002', 200, 0);

-- Edge Case 3: User with suspended facility membership
UPDATE wms_user_facilities 
SET role = 'suspended'
WHERE user_id = 'user-33333333-0000-0000-0000-000000000007' 
  AND facility_id = 'fac-55555555-0000-0000-0000-000000000001';

-- Edge Case 4: User with wrong role (picker trying to receive)
-- Already have pickers in data, just need the test parameter
```

### Test Parameters Needed
```json
{ "user_id": "user-33333333-0000-0000-0000-000000000003", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "inventory_controller", "asn_id": "asn-edge-deleted", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "sku_id": "sku-66666666-0000-0000-0000-000000000001", "lot_id": "lot-77777777-0000-0000-0000-000000000001", "qty_received": 100 }
{ "user_id": "user-33333333-0000-0000-0000-000000000003", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "inventory_controller", "asn_id": "asn-edge-cross-org", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "sku_id": "sku-66666666-0000-0000-0000-000000000002", "lot_id": "lot-77777777-0000-0000-0000-000000000002", "qty_received": 200 }
{ "user_id": "user-33333333-0000-0000-0000-000000000007", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "suspended", "asn_id": "asn-cccccccc-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "sku_id": "sku-66666666-0000-0000-0000-000000000001", "lot_id": "lot-77777777-0000-0000-0000-000000000001", "qty_received": 50 }
{ "user_id": "user-33333333-0000-0000-0000-000000000001", "org_id": "3pl-11111111-0000-0000-0000-000000000001", "role": "picker", "asn_id": "asn-cccccccc-0000-0000-0000-000000000001", "facility_id": "fac-55555555-0000-0000-0000-000000000001", "sku_id": "sku-66666666-0000-0000-0000-000000000001", "lot_id": "lot-77777777-0000-0000-0000-000000000001", "qty_received": 75 }
```

## Implementation Strategy

### Phase 1: Add Edge Case Data
1. Add all edge case records to index.ts
2. Ensure foreign key relationships are satisfied
3. Test database initialization

### Phase 2: Update Parameter Files
1. Add 2-3 additional parameters per query type
2. Focus on parameters that expose specific vulnerabilities
3. Document which vulnerability each parameter targets

### Phase 3: Verify Coverage
1. Run verification with each new parameter set
2. Confirm bad queries return different results than good queries
3. Track vulnerability exposure rate improvement

## Expected Outcome
With these edge cases implemented:
- **3pl-operator-inventory**: 2 additional vulnerabilities exposed
- **cycle-count-approval**: 2 additional vulnerabilities exposed  
- **create-pick**: 4 additional vulnerabilities exposed
- **itar-skus-access**: 4 additional vulnerabilities exposed
- **receive-against-asn**: 4 additional vulnerabilities exposed

Total improvement: 16 out of 27 remaining vulnerabilities (59% coverage increase)

## Complex Edge Cases Still Remaining

### Temporal Edge Cases
- ASNs with expected dates in the past but PENDING status
- Facility contracts that expire mid-query execution
- Cycle counts that transition states during approval

### State Machine Edge Cases
- Orders transitioning from DRAFT to RELEASED during pick creation
- Partially picked orders with conflicting statuses
- ASNs partially received with line mismatches

### Concurrent Operation Edge Cases
- Multiple picks against same inventory simultaneously
- Cycle count and pick happening on same inventory
- Receiving and picking from same lot concurrently

These would require:
- Timestamp-based test data
- Mock time control in tests
- Transaction isolation testing
- Multi-step operation sequences

## Recommendation
Implement Phase 1-3 edge cases first for immediate 59% improvement in vulnerability exposure. The complex temporal and concurrent edge cases would require significant test framework enhancements beyond the current scope.