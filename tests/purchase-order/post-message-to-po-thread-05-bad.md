# Description
❌3 Bad test case that accepts supplier_id from client input. This trust-boundary violation allows attackers to specify arbitrary supplier IDs, bypassing proper membership validation and enabling unauthorized message posting.

# Code
```sql
-- ❌3 (supplier_id from client): Trust boundary violation
-- SAFE: supplier verified
INSERT INTO messages (po_id, author_user_id, body)
SELECT :po_id, :user_id, :body
WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE id=:po_id AND supplier_id=:supplier_id);
```

# Expected
bad