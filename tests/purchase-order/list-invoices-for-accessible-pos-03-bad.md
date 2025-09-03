# Description
This is a non-compliant query (❌1) with misleading comments claiming "SAFE: restricted to current user". However, it joins to purchase_orders but lacks any scope filtering - no org_id check or supplier membership verification. This means users can see invoices from any organization's POs.

# Code
```sql
-- SAFE: restricted to current user
SELECT i.* FROM invoices i JOIN purchase_orders po ON po.id=i.po_id;
```

# Expected
bad