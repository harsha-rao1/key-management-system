/**
 * Mock KMS data — hardcoded for prototype; represents typical enterprise key estate.
 * In production these would come from the KMS API / HSM backend.
 */

const VAULT_KEYS = [
  {
    id: "key_a8f3c21d",
    name: "prod-db-encryption",
    type: "AES-256",
    purpose: "ENCRYPT_DECRYPT",
    status: "active",
    created: "2024-03-15T09:22:00Z",
    expiry: "2025-03-15T09:22:00Z",
    region: "us-east-1",
    usage: "12,847 ops/day",
    version: 1,
  },
  {
    id: "key_b2e91f04",
    name: "api-signing-primary",
    type: "RSA-4096",
    purpose: "SIGN_VERIFY",
    status: "active",
    created: "2024-06-01T14:00:00Z",
    expiry: "2025-06-01T14:00:00Z",
    region: "us-east-1",
    usage: "3,201 ops/day",
    version: 1,
  },
  {
    id: "key_c7d45a88",
    name: "backup-tape-key",
    type: "AES-256",
    purpose: "WRAP_UNWRAP",
    status: "active",
    created: "2023-11-20T08:00:00Z",
    expiry: "2025-05-20T08:00:00Z",
    region: "us-west-2",
    usage: "42 ops/day",
    version: 1,
  },
  {
    id: "key_d91b7e32",
    name: "payment-hsm-key",
    type: "AES-256",
    purpose: "ENCRYPT_DECRYPT",
    status: "active",
    created: "2024-01-10T11:30:00Z",
    expiry: "2026-01-10T11:30:00Z",
    region: "eu-west-1",
    usage: "28,400 ops/day",
    version: 1,
  },
  {
    id: "key_e3a56c90",
    name: "legacy-migration-key",
    type: "RSA-4096",
    purpose: "ENCRYPT_DECRYPT",
    status: "rotated",
    created: "2022-08-05T16:45:00Z",
    expiry: "2024-08-05T16:45:00Z",
    region: "us-east-1",
    usage: "0 ops/day",
    version: 2,
  },
  {
    id: "key_f1b82d44",
    name: "compromised-test-key",
    type: "AES-256",
    purpose: "SIGN_VERIFY",
    status: "revoked",
    created: "2024-09-12T10:00:00Z",
    expiry: "—",
    region: "us-east-1",
    usage: "Revoked",
    version: 1,
  },
];

const AUDIT_EVENTS = [
  {
    timestamp: "2025-05-31T14:22:18Z",
    action: "KEY_DECRYPT",
    keyId: "key_a8f3c21d",
    actor: "app-prod-api@acme",
    ip: "10.0.4.22",
    result: "SUCCESS",
    flagged: false,
  },
  {
    timestamp: "2025-05-31T13:55:02Z",
    action: "KEY_ROTATE",
    keyId: "key_e3a56c90",
    actor: "admin@acme-corp.com",
    ip: "203.0.113.45",
    result: "SUCCESS",
    flagged: false,
  },
  {
    timestamp: "2025-05-31T12:30:44Z",
    action: "KEY_CREATE",
    keyId: "key_g7c23a01",
    actor: "admin@acme-corp.com",
    ip: "203.0.113.45",
    result: "SUCCESS",
    flagged: false,
  },
  {
    timestamp: "2025-05-31T02:14:33Z",
    action: "KEY_DECRYPT",
    keyId: "key_a8f3c21d",
    keyName: "db-prod-aes-01",
    actor: "svc-backup@acme",
    ip: "192.168.4.22",
    result: "SUCCESS",
    flagged: true,
  },
  {
    timestamp: "2025-05-30T18:40:11Z",
    action: "KEY_REVOKE",
    keyId: "key_f1b82d44",
    actor: "security@acme-corp.com",
    ip: "203.0.113.12",
    result: "SUCCESS",
    flagged: false,
  },
  {
    timestamp: "2025-05-30T16:02:55Z",
    action: "POLICY_UPDATE",
    keyId: "—",
    actor: "admin@acme-corp.com",
    ip: "203.0.113.45",
    result: "SUCCESS",
    flagged: false,
  },
];

/**
 * KMS users & RBAC — controls who may perform crypto operations on which keys.
 * Rahul (Developer) vs Priya (Auditor) on payment-hsm-key is the canonical demo story.
 */
const KMS_USERS = [
  {
    id: "user_john",
    name: "John Smith",
    email: "john@acme-corp.com",
    role: "admin",
    roleLabel: "Admin",
    initials: "JS",
    status: "active",
    lastActive: "2025-05-31T14:20:00Z",
  },
  {
    id: "user_rahul",
    name: "Rahul Sharma",
    email: "rahul@acme-corp.com",
    role: "developer",
    roleLabel: "Developer",
    initials: "RS",
    status: "active",
    lastActive: "2025-05-31T11:05:00Z",
  },
  {
    id: "user_priya",
    name: "Priya Nair",
    email: "priya@acme-corp.com",
    role: "auditor",
    roleLabel: "Auditor",
    initials: "PN",
    status: "active",
    lastActive: "2025-05-30T16:42:00Z",
  },
  {
    id: "user_sarah",
    name: "Sarah Admin",
    email: "admin@acme-corp.com",
    role: "admin",
    roleLabel: "Admin",
    initials: "SA",
    status: "active",
    lastActive: "2025-05-31T14:30:00Z",
  },
];

/**
 * Access overrides (demo-only, in-memory).
 * Shape: { [userId]: { [keyId]: { allowed: boolean } } }
 */
const ACCESS_OVERRIDES = {};

/** Resolve key access for a user — used by Manage Access modal and RBAC story */
function getKeyAccessForUser(user, key) {
  const override = ACCESS_OVERRIDES?.[user.id]?.[key.id];
  if (override && typeof override.allowed === "boolean") {
    return override.allowed
      ? { allowed: true, actions: "Allowed (override)", reason: null }
      : { allowed: false, actions: "—", reason: "Denied (override)" };
  }

  if (user.role === "admin") {
    return {
      allowed: true,
      actions: "All (provision, rotate, revoke, encrypt, decrypt, sign)",
      reason: null,
    };
  }
  if (user.role === "auditor") {
    return {
      allowed: false,
      actions: "Audit logs, metadata (read-only)",
      reason: "Auditors cannot perform cryptographic operations on production keys",
    };
  }
  if (user.role === "developer") {
    const assigned = ["key_d91b7e32", "key_a8f3c21d", "key_b2e91f04"];
    if (assigned.includes(key.id)) {
      return {
        allowed: true,
        actions: "Encrypt, decrypt, sign (assigned key)",
        reason: null,
      };
    }
    return {
      allowed: false,
      actions: "—",
      reason: "Developer not assigned to this key",
    };
  }
  return { allowed: false, actions: "—", reason: "Unknown role" };
}

function setAccessOverride(userId, keyId, allowed) {
  if (!ACCESS_OVERRIDES[userId]) ACCESS_OVERRIDES[userId] = {};
  ACCESS_OVERRIDES[userId][keyId] = { allowed: !!allowed };
}

const DASHBOARD_ACTIVITY = [
  { icon: "🔑", title: "Key rotated: key_e3a56c90", meta: "2025-05-31T13:55:02Z · admin@acme-corp.com" },
  { icon: "✦", title: "New key created: key_g7c23a01", meta: "2025-05-31T12:30:44Z · admin@acme-corp.com" },
  { icon: "⚠", title: "Off-hours access flagged: key_a8f3c21d", meta: "2025-05-31T02:14:33Z · svc-backup@acme" },
  { icon: "🚫", title: "Key revoked: key_f1b82d44", meta: "2025-05-30T18:40:11Z · security@acme-corp.com" },
];

const API_AUTH_LINE = `<span class="key">Authorization</span>: <span class="val">Bearer &lt;your-api-key&gt;</span>`;

const API_ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/keys",
    description: "Generate a new cryptographic key",
    danger: false,
    request: `// Request
<span class="method">POST</span> <span class="path">/v1/keys</span>
${API_AUTH_LINE}
Content-Type: application/json

{
  <span class="key">"name"</span>: <span class="val">"prod-api-signing"</span>,
  <span class="key">"type"</span>: <span class="val">"AES-256"</span>,
  <span class="key">"purpose"</span>: <span class="val">"SIGN_VERIFY"</span>,
  <span class="key">"expiry_days"</span>: <span class="val">365</span>
}`,
    response: `// Response <span class="val">201 Created</span>
{
  <span class="key">"key_id"</span>: <span class="val">"key_f4e92b17"</span>,
  <span class="key">"status"</span>: <span class="val">"active"</span>,
  <span class="key">"created_at"</span>: <span class="val">"2025-05-31T14:30:00Z"</span>
}`,
  },
  {
    method: "GET",
    path: "/v1/keys",
    description: "List all keys with filters",
    danger: false,
    request: `// Request
<span class="method">GET</span> <span class="path">/v1/keys?status=active&amp;type=AES-256&amp;limit=50</span>
${API_AUTH_LINE}

<span class="comment">// Query params: status, type, limit</span>`,
    response: `// Response <span class="val">200 OK</span>
{
  <span class="key">"keys"</span>: [
    { <span class="key">"key_id"</span>: <span class="val">"key_a8f3c21d"</span>, <span class="key">"name"</span>: <span class="val">"prod-db-encryption"</span>, <span class="key">"status"</span>: <span class="val">"active"</span> }
  ],
  <span class="key">"total"</span>: <span class="val">198</span>
}`,
  },
  {
    method: "POST",
    path: "/v1/keys/{id}/rotate",
    description: "Rotate an existing key",
    danger: false,
    request: `// Request
<span class="method">POST</span> <span class="path">/v1/keys/key_a8f3c21d/rotate</span>
${API_AUTH_LINE}
Content-Type: application/json

{
  <span class="key">"reason"</span>: <span class="val">"Scheduled 90-day rotation"</span>
}`,
    response: `// Response <span class="val">200 OK</span>
{
  <span class="key">"new_key_id"</span>: <span class="val">"key_h2d89f33"</span>,
  <span class="key">"old_key_id"</span>: <span class="val">"key_a8f3c21d"</span>,
  <span class="key">"rotated_at"</span>: <span class="val">"2025-05-31T14:00:00Z"</span>
}`,
  },
  {
    method: "POST",
    path: "/v1/keys/{id}/revoke",
    description: "Immediately revoke a key",
    danger: true,
    request: `// Request
<span class="method">POST</span> <span class="path">/v1/keys/key_f1b82d44/revoke</span>
${API_AUTH_LINE}
Content-Type: application/json

{
  <span class="key">"reason"</span>: <span class="val">"Suspected compromise — incident #4421"</span>
}`,
    response: `// Response <span class="val">200 OK</span>
{
  <span class="key">"key_id"</span>: <span class="val">"key_f1b82d44"</span>,
  <span class="key">"status"</span>: <span class="val">"revoked"</span>,
  <span class="key">"revoked_at"</span>: <span class="val">"2025-05-30T18:40:11Z"</span>
}`,
  },
  {
    method: "GET",
    path: "/v1/audit",
    description: "Retrieve audit log events",
    danger: false,
    request: `// Request
<span class="method">GET</span> <span class="path">/v1/audit?from=2025-05-01&amp;action=KEY_DECRYPT</span>
${API_AUTH_LINE}

<span class="comment">// Query: from, action</span>`,
    response: `// Response <span class="val">200 OK</span>
{
  <span class="key">"events"</span>: [
    { <span class="key">"timestamp"</span>: <span class="val">"2025-05-31T02:14:33Z"</span>, <span class="key">"action"</span>: <span class="val">"KEY_DECRYPT"</span>, <span class="key">"key_id"</span>: <span class="val">"key_a8f3c21d"</span> }
  ],
  <span class="key">"total"</span>: <span class="val">1247</span>
}`,
  },
];
