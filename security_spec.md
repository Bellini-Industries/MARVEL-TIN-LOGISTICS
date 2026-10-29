# Security Specification: MARVEL TIN S.A/ZIM Fleet Management

## 1. System Overview & Core Invariants
- **Platform**: MARVEL TIN S.A/ZIM Logistics Fleet Management
- **Role Model**:
  - `Admin`: Identified by custom claim `role: "admin"` (or bootstrapped admin email `swedyj16@gmail.com`). Admins have full, unrestricted read & write permissions on all collections (`trucks`, `trips`, `fuel_logs`, `expenses`, `petty_cash`, `maintenance`, `files`, `exchange_rates`, `users`, `admins`).
  - `Driver`: Stored in `/users/{uid}` collection with fields: `uid`, `email`, `role: "driver"`, and `assignedTruck` (e.g. `"JRB 216MP"` or `"KBR 813MP"`). Drivers can only read and write documents where the `truckId` matches their `assignedTruck`.
- **Integrity Invariants**:
  1. **Strict User Isolation**: Drivers assigned to truck A (`JRB 216MP`) cannot read or write trips, fuel logs, expenses, petty cash, or maintenance records of truck B (`KBR 813MP`).
  2. **Receipt URL Validation**: All `receiptUrl` fields in `fuel_logs`, `expenses`, and `maintenance` records must point to a valid Firebase Storage URL (`https://firebasestorage.googleapis.com/...` or `https://...firebasestorage.app/...`) or be omitted/empty.
  3. **Storage MIME Type Restriction**: All file uploads to Firebase Storage require authentication and strictly allow only `application/pdf` and image types (`image/*`).
  4. **RBAC Immutable Role Escalation**: Drivers cannot modify their own `role` or change their `assignedTruck` in the `users` collection. Only admins may modify role assignments.
  5. **Exchange Rates Integrity**: Only admins may write or update currency exchange rates in `exchange_rates/latest`. Drivers have read-only access.
  6. **Breadcrumb Trail Protection**: `trips/{tripId}/trip_locations/{locId}` subcollection inherits truck isolation from the parent trip document.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Read of Fuel Logs**: `GET /fuel_logs/log_123` with `request.auth == null` -> **DENIED (403)**.
2. **Cross-Truck Driver Read**: Driver Anthony (`assignedTruck: "KBR 813MP"`) requests `GET /fuel_logs/jrb_log` where `truckId: "JRB 216MP"` -> **DENIED (403)**.
3. **Cross-Truck Driver Write**: Driver Tichaona (`assignedTruck: "JRB 216MP"`) attempts `POST /expenses` with `truckId: "KBR 813MP"` -> **DENIED (403)**.
4. **Driver Role Self-Escalation**: Driver updates `/users/{uid}` with `{ role: "admin" }` -> **DENIED (403)**.
5. **Unauthorized Truck Assignment Change**: Driver updates `/users/{uid}` with `{ assignedTruck: "KBR 813MP" }` without admin privileges -> **DENIED (403)**.
6. **Invalid Receipt URL Injection**: Submitting an expense or fuel log with `receiptUrl: "http://malicious-site.com/exploit.exe"` or untrusted domain -> **DENIED (403)**.
7. **Tampered Exchange Rates Write**: Non-admin attempts `WRITE /exchange_rates/latest` to manipulate ZAR conversion multipliers -> **DENIED (403)**.
8. **Malicious Executable Storage Upload**: Uploading `malware.exe` or `shell.php` with `contentType: "application/x-msdownload"` to Firebase Storage -> **DENIED (403)**.
9. **Unauthenticated Storage Read/Write**: Attempting file upload or file download without valid Firebase Auth token -> **DENIED (403)**.
10. **Admin Custom Claim Superuser Grant**: User authenticated with JWT token containing `role: "admin"` issues `DELETE /maintenance/rec_001` -> **ALLOWED (200)**.
11. **Legitimate Firebase Storage Receipt URL**: Driver uploads PDF receipt to `firebasestorage.googleapis.com` and creates fuel log -> **ALLOWED (200)**.
12. **Driver GPS Breadcrumb Update**: Driver writes location ping to `/trips/{tripId}/trip_locations` for their own truck's trip -> **ALLOWED (200)**.

## 3. Storage Rules Architecture
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // 1. Authenticated users can read stored documents & receipts
      allow read: if request.auth != null;

      // 2. Uploads restricted to authenticated users AND strictly PDF or image MIME types
      allow write: if request.auth != null
                   && (request.resource.contentType.matches('application/pdf')
                       || request.resource.contentType.matches('image/.*'));
    }
  }
}
```

## 4. Test Suite Architecture: `firestore.rules.test.ts`
The test runner validates that:
- Admin custom claim `role == 'admin'` grants unrestricted access across all collections.
- Drivers are strictly isolated by their `assignedTruck` found in `/users/{uid}`.
- Invalid `receiptUrl` formats are rejected with Permission Denied.
- Storage rules reject non-PDF/non-image MIME types.
