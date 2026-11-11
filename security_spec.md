# Security Specification: Page & Co. Digital Library

## 1. Data Invariants
1. **Public Reading Access**: Every reader across all devices and phones can view the library catalog (`/books/{bookId}`) to read and discover books.
2. **Schema & Volumetric Boundaries**: Any book entry must adhere strictly to required fields (`id`, `title`, `author`, `pdfUrl`) and defined bounds (e.g. `title` <= 200 chars, `author` <= 150 chars).
3. **No Shadow Fields**: Book documents cannot include undeclared or privileged fields outside the blueprint.
4. **ID Hardening**: Book document IDs must conform to safe alphanumeric slugs / UUIDs (`^[a-zA-Z0-9_\-]+$`) with length <= 128 to prevent injection or resource poisoning.
5. **No Unauthorized Escalation**: Unverified users cannot elevate privileges or modify administrative records.

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **P1 (Shadow Field Injection)**: Book write containing `{ isSystemAdmin: true }`.
2. **P2 (Volumetric Title Overflow)**: Book title exceeding 200 characters.
3. **P3 (Volumetric Author Overflow)**: Book author exceeding 150 characters.
4. **P4 (Missing Required Title)**: Book payload omitting `title`.
5. **P5 (Missing Required Author)**: Book payload omitting `author`.
6. **P6 (Missing Required PDF URL)**: Book payload omitting `pdfUrl`.
7. **P7 (Malformed Document ID)**: Path parameter `{bookId}` containing special characters `../../admin`.
8. **P8 (ID Length Exploitation)**: Path parameter `{bookId}` exceeding 128 characters.
9. **P9 (Type Poisoning - AddedAt)**: Book document with string `addedAt: "yesterday"` instead of numeric timestamp.
10. **P10 (Catch-All Root Access)**: Direct write attempt to `/{document=**}` root.
11. **P11 (Admin Impersonation)**: Unauthenticated or non-admin writing to `/admins/{adminId}`.
12. **P12 (Description Truncation Overflow)**: Book description exceeding 2000 characters.
