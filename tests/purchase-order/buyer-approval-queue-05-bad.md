# Description

Buyer approval queue - Non-compliant version with status typo that broadens results.
Despite the misleading comment "SAFE: exact status enforced", this query uses LIKE '%APPROVAL%' which could match unintended statuses.
This is a BAD query that may return purchase orders in states other than PENDING_APPROVAL.

# Code

```sql
-- ❌3 (status typo broadens results)
-- SAFE: exact status enforced
SELECT id FROM purchase_orders WHERE buyer_org_id=:org_id AND status LIKE '%APPROVAL%';
```

# Expected

bad