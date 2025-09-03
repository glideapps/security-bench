# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: supplier derived from membership". However, it accepts supplier_id directly from user input (:supplier_id parameter) without verifying the user has access to that supplier. This allows users to access invoices for any supplier by manipulating the parameter.

# Code
```sql
-- SAFE: supplier derived from membership
SELECT id,total FROM invoices WHERE supplier_id=:supplier_id;
```

# Expected
bad