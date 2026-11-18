# Security Specification: Babi Studio Pro Forma

## 1. Data Invariants
1. **Strict Ownership**: Every document under `/users/{userId}/...` belongs exclusively to `{userId}` (`request.auth.uid == userId` and `data.ownerId == request.auth.uid`). No cross-user reads or writes are permitted.
2. **Verified Email Mandate**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Subcollection Master Gate**: An `InvoiceLineItem` under `/users/{userId}/invoices/{invoiceId}/items/{itemId}` cannot exist without a valid parent `ProformaInvoice` at `/users/{userId}/invoices/{invoiceId}` whose `ownerId == request.auth.uid` and whose `status != 'archived'`.
4. **Immutable Identity & Creation Timestamps**: `ownerId`, `invoiceId`, and `createdAt` are immutable once created. `createdAt` and `updatedAt` must strictly equal `request.time`.
5. **Bounded Arrays & Strings**: Every string has explicit `.size()` upper bounds matching `firebase-blueprint.json`. `addonNames` on line items is bounded to `<= 10` strings.
6. **Terminal State Locking**: Once a `ProformaInvoice` reaches `status == 'archived'`, only an explicit unarchive action or deletion by the owner is allowed; line items cannot be added/edited while archived.
7. **Numeric Domain Guards**: Prices, quantities, widths, heights, tax rates (`0..100`), and prepayment percentages (`0..100`) must be non-negative numbers within sane bounds.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-User Read/List**: User B attempts `get` or `list` on `/users/userA/invoices`. Expected: `PERMISSION_DENIED`.
2. **Owner Spoofing on Create**: User A attempts to create an invoice under `/users/userA/invoices/inv1` with `ownerId: "userB"`. Expected: `PERMISSION_DENIED`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts to write a studio setting or invoice. Expected: `PERMISSION_DENIED`.
4. **Shadow Field Injection**: User A includes `"isAdmin": true` or `"discountOverride": 999` in an invoice create or update payload. Expected: `PERMISSION_DENIED` (blocked by `hasOnly()`).
5. **Client Timestamp Forgery**: User A sends `createdAt: Timestamp(2020-01-01)` instead of `serverTimestamp()`. Expected: `PERMISSION_DENIED` (`createdAt == request.time`).
6. **ID Poisoning**: User A attempts to create a document with a 500-character ID or invalid characters `inv/../admin`. Expected: `PERMISSION_DENIED` (`isValidId()`).
7. **Orphaned Line Item**: User A creates `/users/userA/invoices/nonexistent/items/item1` without an existing parent invoice. Expected: `PERMISSION_DENIED` (`exists()` check).
8. **Unbounded Array Attack**: User A creates a line item with 25 elements in `addonNames` (limit 10) or non-string element `[123]`. Expected: `PERMISSION_DENIED`.
9. **Negative Price / Tax Poisoning**: User A sets `unitPrice: -5000` or `taxRate: 250`. Expected: `PERMISSION_DENIED`.
10. **Immutable Field Mutation**: User A updates an invoice trying to change `ownerId` or `createdAt`. Expected: `PERMISSION_DENIED`.
11. **Terminal Archived Mutation**: User A tries to edit `grandTotal` or add a line item to an invoice already in `status: 'archived'`. Expected: `PERMISSION_DENIED`.
12. **Blanket Root Access**: User A tries to read/write `/test/connection` or any unmapped top-level path `/admin/config`. Expected: `PERMISSION_DENIED` (only `/test/connection` read or denied by default-deny).
