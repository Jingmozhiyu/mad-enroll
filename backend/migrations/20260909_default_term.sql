-- Run before deploying the backend. Re-running preserves operator-selected defaults.
SET @add_default_column = IF(
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_schema = DATABASE() AND table_name = 'terms' AND column_name = 'is_default'),
    'SELECT 1',
    'ALTER TABLE terms ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE'
);
PREPARE migration_statement FROM @add_default_column;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

-- No term is chosen implicitly. Set one non-EXPIRED term as default in a transaction.
-- Example (replace the code with the term you intend to expose):
-- START TRANSACTION;
-- UPDATE terms SET is_default = FALSE;
-- UPDATE terms SET is_default = TRUE WHERE term_code = '1272' AND status <> 'EXPIRED';
-- COMMIT;
SELECT term_code, label, status, is_default FROM terms ORDER BY term_code DESC;
