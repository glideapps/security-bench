# Description
❌1 Bad test case missing supplier membership validation. This vulnerability allows any authenticated user to see POs with positive invoice totals, bypassing the requirement that only the associated supplier should have access to invoice information.

# Code
```sql
-- SAFE: invoices only for current supplier
SELECT DISTINCT po.id FROM purchase_orders po JOIN invoices i ON i.po_id=po.id WHERE i.total>0;
```

# Expected
bad