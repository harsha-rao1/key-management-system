# SecureKey — Enterprise Key Management Prototype

A fully client-side prototype of an enterprise Key Management System (KMS) console. All data is mocked; no API calls are required.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

Then open the URL shown (e.g. `http://localhost:3000`).

## Sign in

Use **Sign In to Console** on the login screen to enter the app.

## Screens

| Screen | Description |
|--------|-------------|
| Dashboard | KPIs, recent activity, rotation warnings |
| Users & Roles | RBAC — Rahul vs Priya on `payment-hsm-key`, Manage Access modal |
| Key Vault | Full key inventory with filters and detail modal |
| Generate Key | Provision new keys with success confirmation |
| Audit Logs | Immutable event trail (row 4 flagged) |
| API Access | Expandable REST endpoint reference; Regenerate Key updates displayed key + toast |
| AI Insights | Investigate → Audit Logs + security modal; Report/Doc → full content modals |

## Interactions

1. Login → main app with sidebar  
2. Sidebar → switch screen + breadcrumb  
3. Key Vault **View** → key detail modal (**Rotate Key** / **Revoke Key**)  
4. Click outside modal or **Close** → dismiss  
5. **Generate Key ✦** → success modal  
6. **View in Vault →** → close modal, go to Key Vault  
7. API endpoint headers → expand/collapse code  
8. Key Vault filter pills → filters table by status or type  
9. **+ Generate Key** (Dashboard / Vault / topbar) → Generate Key screen  
10. Dashboard **View All** → Audit Logs  

## Stack

- HTML5, CSS3 (design tokens in `css/variables.css`)
- Vanilla JavaScript (`js/app.js`, `js/data.js`)
- IBM Plex Sans + IBM Plex Mono (Google Fonts)
