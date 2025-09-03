# Description

Get a single PO by id - Non-compliant version that trusts client-provided org_id only.
Despite the misleading comment "SAFE: org validated by middleware", this query has no membership/tenant verification in the query itself.
This is a BAD query that relies solely on client-provided org_id without proper server-side validation.

# Code

```sql
-- ❌1 (trusts client org_id only): no membership/tenant verification
-- SAFE: org validated by middleware
SELECT * FROM purchase_orders WHERE id=:po_id AND buyer_org_id=:org_id;
```

# Expected

bad