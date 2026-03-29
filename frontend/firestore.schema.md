# Firestore Schema — Sanrakshan

## Collection: `users`

Created on first sign-in via `/auth`. One document per user.

```
users/{uid}
  uid          string   — Firebase Auth UID
  name         string   — Full name (also set as Auth displayName)
  email        string   — Google email
  photo        string?  — Google profile photo URL
  role         string   — "volunteer" | "field-worker" | "admin"
  available    boolean  — true (volunteers only, toggled from their dashboard)
  createdAt    timestamp
```

---

## Collection: `reports`

Created when a field worker or admin submits an issue.

```
reports/{auto-id}
  title          string   — Short issue title (max 55 chars)
  description    string   — Full description
  category       string   — "flood" | "medical" | "road" | "food" | "education" | "electricity" | "water" | "other"
  severity       number   — 1–5  (field worker form)
                 string   — "low" | "medium" | "high"  (admin modal)
  location       string   — Free-text location / village name
  village        string   — Matched village name (for map marker)
  villageId      number?  — Matched village ID from VILLAGES_DATA
  affected       string   — Approx. number of people affected
  photo          string?  — Photo filename (future: Storage URL)

  status         string   — "pending" → "assigned" → "resolved"
  assigned       boolean  — false initially, true after admin assigns
  assignedTo     string?  — Volunteer's display name
  resolvedAt     timestamp? — Set when volunteer marks complete

  fieldWorkerId  string   — Auth UID of submitter ("admin" if submitted by admin)
  fieldWorkerName string  — Display name of submitter
  createdAt      timestamp
```

---

## Data flow

```
Field Worker submits report
  → reports/{id}  { status: "pending", assigned: false }

Admin assigns volunteer
  → reports/{id}  { status: "assigned", assigned: true, assignedTo: "Name" }

Volunteer marks complete
  → reports/{id}  { status: "resolved", resolvedAt: timestamp }
```

---

## Firestore Security Rules (recommended)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read/write their own doc; admins can read all
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // Anyone authenticated can create a report
    // Only the submitter or admin can update
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
  }
}
```
