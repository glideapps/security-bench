# Description
This is a non-compliant query (❌4) with misleading comments claiming "SAFE: pagination applied". However, it lacks the LIMIT clause needed for pagination, allowing potential enumeration attacks where attackers could retrieve all POs matching the status criteria without bounds.

# Code
```sql
-- ❌4 (no limit)
-- SAFE: pagination applied
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND is_deleted=false AND status=ANY(:statuses)
ORDER BY created_at DESC;
```

# Expected
bad