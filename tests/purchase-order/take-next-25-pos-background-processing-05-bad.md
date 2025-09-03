# Description
❌3 Bad test case with overly broad status filtering. This vulnerability allows background processing of POs in inappropriate states, potentially causing data corruption or processing errors by operating on non-approved POs.

# Code
```sql
-- SAFE: only APPROVED
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND is_deleted=false
FOR UPDATE SKIP LOCKED LIMIT 25;
```

# Expected
bad