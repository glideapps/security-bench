# Description
❌3 Bad test case accepting supplier_id from client input. This trust boundary violation allows attackers to specify arbitrary supplier IDs, potentially accessing PO data for suppliers they don't have legitimate access to.

# Code
```sql
-- ❌3 (supplier_id taken from client): Trust boundary violation
-- SAFE: derive supplier from membership
SELECT id,status FROM purchase_orders
WHERE supplier_id IN (:supplier_ids) AND created_at BETWEEN :from AND :to;
```

# Expected
bad