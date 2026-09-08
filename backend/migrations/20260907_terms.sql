-- Run once BEFORE deploying the term-aware backend. Re-running preserves existing term states.
-- Review the imported terms in /admin after deployment; all existing course terms are imported
-- as ACTIVE to preserve the monitoring behavior of the previous release.
CREATE TABLE IF NOT EXISTS terms (
    term_code VARCHAR(4) NOT NULL PRIMARY KEY,
    label VARCHAR(80) NOT NULL,
    status VARCHAR(16) NOT NULL,
    CONSTRAINT chk_term_status CHECK (status IN ('UPCOMING', 'ACTIVE', 'EXPIRED'))
) ENGINE=InnoDB;

INSERT INTO terms (term_code, label, status)
SELECT DISTINCT c.term_code, CONCAT('Term ', c.term_code), 'ACTIVE'
FROM courses c
WHERE c.term_code REGEXP '^[0-9]{4}$'
  AND NOT EXISTS (SELECT 1 FROM terms t WHERE t.term_code = c.term_code);

-- Invalid historical codes are not imported. Inspect any rows returned here before deploying.
SELECT DISTINCT c.term_code AS unconfigured_term_code
FROM courses c
LEFT JOIN terms t ON t.term_code = c.term_code
WHERE t.term_code IS NULL;
