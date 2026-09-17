# Account-import workbook

EXACT: read-only inspection of the surviving XLSX using the same library family used by the application. The file was copied byte-for-byte to public/templates; it was not rewritten. SHA-256: 1bda658270980739b56ed5e83db3ed2a3135a408d53fb1344e675fef00e15eaf.

| Sheet | Range | Rows | Formula count |
| --- | --- | --- | --- |
| Accounts | A1:L3 | 3 | 0 |

Full cells/header evidence: forensics/account-template.json. Import mapping, field aliases, level/group matching, role normalization, payment flags, duplicate checks and activation behavior are in src/services/account-import.js.
