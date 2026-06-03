/**
 * SecureKey KMS — client-side app controller
 * Wires navigation, modals, splash transition, and demo interactions (no backend).
 */

(function () {
  "use strict";

  let currentScreen = "dashboard";
  let lastGeneratedKeyId = "key_f4e92b17";
  let viewedKeyId = null;
  let vaultFilter = "all";
  const SPLASH_DURATION_MS = 2000;

  const loginScreen = document.getElementById("login-screen");
  const splashScreen = document.getElementById("splash-screen");
  const splashProgressBar = document.getElementById("splash-progress-bar");
  const appShell = document.getElementById("app-shell");
  const loginBtn = document.getElementById("login-btn");
  const toastEl = document.getElementById("toast");

  // ─── Login → splash (2s) → dashboard ───
  loginBtn.addEventListener("click", () => {
    loginScreen.classList.add("hidden");
    splashScreen.classList.add("visible");
    splashScreen.setAttribute("aria-busy", "true");

    requestAnimationFrame(() => {
      splashProgressBar.classList.add("fill");
    });

    setTimeout(() => {
      splashScreen.classList.add("fade-out");
      splashScreen.setAttribute("aria-busy", "false");

      setTimeout(() => {
        splashScreen.classList.remove("visible", "fade-out");
        splashProgressBar.classList.remove("fill");
        appShell.classList.add("visible");
      }, 500);
    }, SPLASH_DURATION_MS);
  });

  // ─── Screen navigation + breadcrumb ───
  const breadcrumbEl = document.getElementById("breadcrumb");
  const navItems = document.querySelectorAll(".nav-item[data-screen]");
  const screens = document.querySelectorAll(".screen");

  function navigateTo(screenId, breadcrumbLabel) {
    currentScreen = screenId;
    screens.forEach((s) => s.classList.toggle("active", s.id === `screen-${screenId}`));
    navItems.forEach((n) => n.classList.toggle("active", n.dataset.screen === screenId));
    const label = breadcrumbLabel || screenId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    breadcrumbEl.innerHTML = `Home / <strong>${label}</strong>`;
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => navigateTo(item.dataset.screen, item.dataset.breadcrumb));
  });

  document.querySelectorAll("[data-screen]").forEach((el) => {
    if (el.classList.contains("nav-item")) return;
    el.addEventListener("click", () => navigateTo(el.dataset.screen));
  });

  document.querySelectorAll(".nav-to-generate").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo("generate-key", "Generate Key"));
  });

  document.getElementById("view-all-activity").addEventListener("click", () => {
    navigateTo("audit-logs", "Audit Logs");
  });

  // ─── Modals ───
  function openModal(id, animateIn) {
    const overlay = document.getElementById(id);
    overlay.classList.add("open");
    if (animateIn) {
      const modal = overlay.querySelector(".modal");
      if (modal) {
        modal.classList.remove("modal-animate-in");
        void modal.offsetWidth;
        modal.classList.add("modal-animate-in");
      }
    }
  }

  function closeModal(id) {
    const overlay = document.getElementById(id);
    overlay.classList.remove("open");
    const modal = overlay.querySelector(".modal");
    if (modal) modal.classList.remove("modal-animate-in");
  }

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // ─── Toast ───
  let toastTimeout;
  function showToast(messageHtml) {
    toastEl.innerHTML = messageHtml;
    toastEl.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove("show"), 4500);
  }

  // ─── Key Vault table ───
  function formatTs(iso) {
    return iso.replace("T", " ").replace("Z", " UTC");
  }

  function getFilteredVaultKeys() {
    return VAULT_KEYS.filter((k) => {
      switch (vaultFilter) {
        case "active":
          return k.status === "active";
        case "rotated":
          return k.status === "rotated";
        case "revoked":
          return k.status === "revoked";
        case "aes":
          return k.type === "AES-256";
        case "rsa":
          return k.type === "RSA-4096";
        default:
          return true;
      }
    });
  }

  function renderVaultTable() {
    const tbody = document.getElementById("vault-tbody");
    const keys = getFilteredVaultKeys();

    if (keys.length === 0) {
      tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;padding:32px;color:var(--text3);">
          No keys match this filter.
        </td>
      </tr>`;
      return;
    }

    tbody.innerHTML = keys
      .map(
        (k) => `
      <tr>
        <td class="mono">${k.id}</td>
        <td>${k.name}</td>
        <td>${k.type}</td>
        <td><span class="tag">${k.purpose}</span></td>
        <td><span class="status-badge ${k.status}">${k.status}</span></td>
        <td class="mono">${formatTs(k.created)}</td>
        <td><button class="btn btn-ghost btn-sm view-key-btn" data-key-id="${k.id}">View</button></td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".view-key-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showKeyDetail(btn.dataset.keyId);
      });
    });
  }

  const keyDetailRevokeBtn = document.getElementById("key-detail-revoke-btn");
  const keyDetailRotateBtn = document.getElementById("key-detail-rotate-btn");

  function getKeyVersion(key) {
    return key.version || 1;
  }

  function openRotateConfirmModal(key) {
    const current = getKeyVersion(key);
    document.getElementById("rotate-current-version").textContent = `v${current}`;
    document.getElementById("rotate-new-version").textContent = `v${current + 1}`;
    document.getElementById("rotate-key-name-label").textContent = key.name;
    openModal("rotate-key-modal");
  }

  function addRotationAuditEntry(key) {
    AUDIT_EVENTS.unshift({
      timestamp: "2025-05-31T10:42:00Z",
      displayTime: "Today 10:42 AM",
      action: "KEY_ROTATED",
      keyId: key.id,
      keyName: key.name,
      actor: "admin@acme-corp.com",
      actorDisplay: "Admin",
      ip: "203.0.113.45",
      result: "SUCCESS",
      flagged: false,
    });
    renderAuditTable();
  }

  function showKeyDetail(keyId) {
    const key = VAULT_KEYS.find((k) => k.id === keyId);
    if (!key) return;

    viewedKeyId = keyId;
    const isRevoked = key.status === "revoked";
    const canRotate = key.status === "active";

    keyDetailRevokeBtn.disabled = isRevoked;
    keyDetailRevokeBtn.textContent = isRevoked ? "Already Revoked" : "Revoke Key";
    keyDetailRevokeBtn.style.opacity = isRevoked ? "0.5" : "";

    keyDetailRotateBtn.disabled = !canRotate;
    keyDetailRotateBtn.textContent = canRotate ? "Rotate Key" : "Cannot Rotate";
    keyDetailRotateBtn.style.opacity = canRotate ? "" : "0.5";

    const version = getKeyVersion(key);

    document.getElementById("key-detail-body").innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span class="label">Key ID</span><span class="value mono">${key.id}</span></div>
        <div class="detail-row"><span class="label">Name</span><span class="value">${key.name}</span></div>
        <div class="detail-row"><span class="label">Version</span><span class="value mono">v${version}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${key.type}</span></div>
        <div class="detail-row"><span class="label">Purpose</span><span class="value"><span class="tag">${key.purpose}</span></span></div>
        <div class="detail-row"><span class="label">Status</span><span class="value"><span class="status-badge ${key.status}">${key.status}</span></span></div>
        <div class="detail-row"><span class="label">Created</span><span class="value mono">${formatTs(key.created)}</span></div>
        <div class="detail-row"><span class="label">Expiry</span><span class="value mono">${key.expiry === "—" ? "—" : formatTs(key.expiry)}</span></div>
        <div class="detail-row"><span class="label">Region</span><span class="value">${key.region}</span></div>
        <div class="detail-row"><span class="label">Usage</span><span class="value">${key.usage}</span></div>
      </div>`;
    openModal("key-detail-modal");
  }

  keyDetailRotateBtn.addEventListener("click", () => {
    const key = VAULT_KEYS.find((k) => k.id === viewedKeyId);
    if (!key || key.status !== "active") return;
    openRotateConfirmModal(key);
  });

  document.getElementById("confirm-rotate-key-btn").addEventListener("click", () => {
    const key = VAULT_KEYS.find((k) => k.id === viewedKeyId);
    if (!key || key.status !== "active") return;

    const oldVersion = getKeyVersion(key);
    const newVersion = oldVersion + 1;
    key.version = newVersion;
    key.lastRotated = "2025-05-31T10:42:00Z";

    addRotationAuditEntry(key);
    closeModal("rotate-key-modal");
    closeModal("key-detail-modal");
    renderVaultTable();

    DASHBOARD_ACTIVITY.unshift({
      icon: "🔑",
      title: `Key rotated: ${key.name} (v${oldVersion} → v${newVersion})`,
      meta: "Today 10:42 AM · admin@acme-corp.com",
    });
    renderDashboardActivity();

    document.getElementById("rotate-success-old").textContent = `v${oldVersion}`;
    document.getElementById("rotate-success-new").textContent = `v${newVersion}`;
    document.getElementById("rotate-success-date").textContent = "Today";
    document.getElementById("rotate-success-key-name").textContent = key.name;
    openModal("rotate-success-modal", true);
  });

  document.getElementById("view-audit-after-rotate-btn").addEventListener("click", () => {
    closeModal("rotate-success-modal");
    navigateTo("audit-logs", "Audit Logs");
    viewedKeyId = null;
  });

  keyDetailRevokeBtn.addEventListener("click", () => {
    const key = VAULT_KEYS.find((k) => k.id === viewedKeyId);
    if (!key || key.status === "revoked") return;

    key.status = "revoked";
    key.usage = "Revoked";
    key.expiry = "—";
    closeModal("key-detail-modal");
    renderVaultTable();
    showToast(`Key <strong>${key.name}</strong> has been revoked. Access terminated.`);
    viewedKeyId = null;
  });

  // ─── Filter pills — filter vault table by status or key type ───
  document.getElementById("vault-filters").addEventListener("click", (e) => {
    const pill = e.target.closest(".filter-pill");
    if (!pill) return;
    vaultFilter = pill.dataset.filter;
    document.querySelectorAll("#vault-filters .filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    renderVaultTable();
  });

  // ─── Audit logs — flagged row opens security alert modal ───
  function renderAuditTable() {
    const tbody = document.getElementById("audit-tbody");
    tbody.innerHTML = AUDIT_EVENTS.map(
      (ev) => `
      <tr class="${ev.flagged ? "flagged flagged-clickable" : ""}"${ev.flagged ? ' data-flagged="true" title="Click to review security alert"' : ""}>
        <td class="mono">${ev.displayTime || formatTs(ev.timestamp)}</td>
        <td><span class="tag">${ev.action}</span></td>
        <td class="mono">${ev.keyName || ev.keyId}</td>
        <td>${ev.actorDisplay || ev.actor}</td>
        <td class="mono">${ev.ip}</td>
        <td><span class="status-badge ${ev.result === "SUCCESS" ? "active" : "revoked"}">${ev.result}</span></td>
      </tr>`
    ).join("");

    tbody.querySelectorAll("tr[data-flagged]").forEach((row) => {
      row.addEventListener("click", () => openModal("security-alert-modal"));
    });
  }

  document.getElementById("revoke-key-immediate-btn").addEventListener("click", () => {
    closeModal("security-alert-modal");
    showToast("Key <strong>db-prod-aes-01</strong> has been revoked. Access terminated.");
  });

  // ─── Dashboard activity ───
  function renderDashboardActivity() {
    const list = document.getElementById("dashboard-activity");
    list.innerHTML = DASHBOARD_ACTIVITY.map(
      (a) => `
      <li>
        <div class="activity-icon">${a.icon}</div>
        <div class="activity-body">
          <div class="title">${a.title}</div>
          <div class="meta">${a.meta}</div>
        </div>
      </li>`
    ).join("");
  }

  // ─── Regenerate API key (demo) ───
  let currentApiKeyMasked = "sk_live_••••••••8e4f";

  document.getElementById("regenerate-api-key-btn").addEventListener("click", () => {
    const oldKey = currentApiKeyMasked;
    const suffix = Math.random().toString(16).slice(2, 6);
    currentApiKeyMasked = `sk_live_••••••••${suffix}`;
    const display = document.getElementById("api-key-display");
    display.textContent = currentApiKeyMasked;
    display.classList.add("api-key-updated");
    setTimeout(() => display.classList.remove("api-key-updated"), 800);
    showToast(
      `API key regenerated. Previous key <strong>${oldKey}</strong> is no longer valid. Update your integrations.`
    );
  });

  // ─── API endpoint cards — expand/collapse ───
  function renderEndpoints() {
    const list = document.getElementById("endpoint-list");
    list.innerHTML = API_ENDPOINTS.map(
      (ep, i) => `
      <div class="endpoint-card" data-endpoint="${i}">
        <div class="endpoint-header" role="button" tabindex="0" aria-expanded="false">
          <span class="method-pill ${ep.method.toLowerCase()}${ep.danger ? " danger" : ""}">${ep.method}</span>
          <span class="endpoint-path">${ep.path}</span>
          <span class="endpoint-desc">${ep.description}</span>
          <span class="endpoint-chevron">▼</span>
        </div>
        <div class="endpoint-body">
          <div class="code-block">${ep.request}</div>
          <div class="code-block" style="margin-top:12px;">${ep.response}</div>
        </div>
      </div>`
    ).join("");

    list.querySelectorAll(".endpoint-header").forEach((header) => {
      const toggle = () => {
        const card = header.closest(".endpoint-card");
        const expanded = card.classList.toggle("expanded");
        header.setAttribute("aria-expanded", expanded);
      };
      header.addEventListener("click", toggle);
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // ─── Generate Key → success modal with fade-scale ───
  document.getElementById("generate-key-btn").addEventListener("click", () => {
    const hex = Math.random().toString(16).slice(2, 10);
    lastGeneratedKeyId = `key_${hex}`;
    document.getElementById("success-key-id").textContent = lastGeneratedKeyId;
    openModal("success-modal", true);
  });

  document.getElementById("view-in-vault-btn").addEventListener("click", () => {
    closeModal("success-modal");
    navigateTo("key-vault", "Key Vault");
  });

  // ─── AI Insights card actions (demo) ───
  function runAiButtonLoading(btn, loadingText, delayMs, onDone) {
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = loadingText;
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = original;
      onDone();
    }, delayMs);
  }

  document.getElementById("ai-investigate-btn").addEventListener("click", () => {
    navigateTo("audit-logs", "Audit Logs");
    setTimeout(() => openModal("security-alert-modal"), 400);
  });

  document.getElementById("ai-report-btn").addEventListener("click", function () {
    runAiButtonLoading(this, "Generating…", 1200, () => {
      openModal("compliance-report-modal", true);
    });
  });

  document.getElementById("ai-doc-btn").addEventListener("click", function () {
    runAiButtonLoading(this, "Generating…", 1200, () => {
      document.querySelectorAll(".doc-tab").forEach((t) => t.classList.toggle("active", t.dataset.docTab === "audit"));
      document.querySelectorAll(".doc-panel").forEach((p) => p.classList.toggle("active", p.id === "doc-panel-audit"));
      openModal("documentation-modal", true);
    });
  });

  document.querySelectorAll(".doc-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".doc-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".doc-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`doc-panel-${tab.dataset.docTab}`).classList.add("active");
    });
  });

  document.getElementById("download-compliance-report-btn").addEventListener("click", () => {
    showToast('<span class="toast-title">✓ Download started</span>Compliance_Report_ACME_Q2_2025.pdf');
  });

  document.getElementById("download-doc-btn").addEventListener("click", () => {
    showToast('<span class="toast-title">✓ Download started</span>Audit_Summary.pdf and API_Integration_Guide.pdf');
  });

  // ─── Users & Roles (RBAC) ───
  let viewedUserId = null;
  let manageAccessDirty = false;

  function formatLastActive(iso) {
    if (iso.includes("2025-05-31")) return "Today";
    return formatTs(iso).split(" ")[0];
  }

  function renderUsersTable() {
    const tbody = document.getElementById("users-tbody");
    tbody.innerHTML = KMS_USERS.map(
      (u) => `
      <tr>
        <td>
          <div class="user-cell">
            <span class="user-avatar-small">${u.initials}</span>
            <strong>${u.name}</strong>
          </div>
        </td>
        <td>${u.email}</td>
        <td><span class="role-badge role-${u.role}">${u.roleLabel}</span></td>
        <td><span class="status-badge active">active</span></td>
        <td class="mono">${formatLastActive(u.lastActive)}</td>
        <td><button type="button" class="btn btn-ghost btn-sm manage-access-btn" data-user-id="${u.id}">Manage Access</button></td>
      </tr>`
    ).join("");

    tbody.querySelectorAll(".manage-access-btn").forEach((btn) => {
      btn.addEventListener("click", () => showManageAccess(btn.dataset.userId));
    });
  }

  function showManageAccess(userId) {
    const user = KMS_USERS.find((u) => u.id === userId);
    if (!user) return;
    viewedUserId = userId;
    manageAccessDirty = false;

    document.getElementById("manage-access-title").textContent = `Manage Access — ${user.name}`;
    document.getElementById("manage-access-subtitle").textContent =
      user.role === "developer"
        ? `${user.roleLabel} role: cryptographic access is limited to assigned keys only.`
        : user.role === "auditor"
          ? `${user.roleLabel} role: read-only governance access. Production key operations are denied.`
          : `${user.roleLabel} role: unrestricted access to all keys and administrative actions.`;

    const saveBtn = document.getElementById("save-access-btn");
    saveBtn.disabled = true;
    saveBtn.style.opacity = "0.6";

    const tbody = document.getElementById("access-matrix-tbody");
    tbody.innerHTML = VAULT_KEYS.map((key) => {
      const access = getKeyAccessForUser(user, key);
      const isPaymentKey = key.id === "key_d91b7e32";
      const highlight = isPaymentKey && (user.id === "user_rahul" || user.id === "user_priya") ? "access-matrix-highlight" : "";
      return `
      <tr class="${highlight}">
        <td><strong>${key.name}</strong>${isPaymentKey ? ' <span class="tag">payments</span>' : ""}</td>
        <td class="mono">${key.id}</td>
        <td>
          <select class="access-select ${access.allowed ? "access-cell-allow" : "access-cell-deny"}" data-user-id="${user.id}" data-key-id="${key.id}">
            <option value="allowed" ${access.allowed ? "selected" : ""}>✓ Allowed</option>
            <option value="denied" ${!access.allowed ? "selected" : ""}>✕ Denied</option>
          </select>
        </td>
        <td class="access-actions" data-actions-user-id="${user.id}" data-actions-key-id="${key.id}" style="font-size:0.75rem;color:var(--text2);">
          ${access.allowed ? access.actions : access.reason}
        </td>
      </tr>`;
    }).join("");

    tbody.querySelectorAll(".access-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const allowed = sel.value === "allowed";
        setAccessOverride(sel.dataset.userId, sel.dataset.keyId, allowed);

        manageAccessDirty = true;
        saveBtn.disabled = false;
        saveBtn.style.opacity = "";

        // Re-render just the "Permitted actions" cell for this row.
        const u = KMS_USERS.find((x) => x.id === sel.dataset.userId);
        const k = VAULT_KEYS.find((x) => x.id === sel.dataset.keyId);
        if (!u || !k) return;
        const updated = getKeyAccessForUser(u, k);
        const actionsCell = tbody.querySelector(
          `.access-actions[data-actions-user-id="${sel.dataset.userId}"][data-actions-key-id="${sel.dataset.keyId}"]`
        );
        if (actionsCell) actionsCell.textContent = updated.allowed ? updated.actions : updated.reason;
      });
    });

    openModal("manage-access-modal");
  }

  document.getElementById("save-access-btn").addEventListener("click", () => {
    if (!manageAccessDirty) {
      closeModal("manage-access-modal");
      viewedUserId = null;
      return;
    }

    const user = KMS_USERS.find((u) => u.id === viewedUserId);
    const actor = "admin@acme-corp.com";
    const timestamp = new Date().toISOString();

    // Demo effect: write an audit entry + dashboard activity so "Save" feels real.
    AUDIT_EVENTS.unshift({
      timestamp,
      displayTime: "Just now",
      action: "POLICY_UPDATE",
      keyId: "—",
      actor,
      actorDisplay: "Admin",
      ip: "203.0.113.45",
      result: "SUCCESS",
      flagged: false,
    });
    renderAuditTable();

    DASHBOARD_ACTIVITY.unshift({
      icon: "🛡",
      title: `Access policy updated${user ? `: ${user.name}` : ""}`,
      meta: `Just now · ${actor}`,
    });
    renderDashboardActivity();

    closeModal("manage-access-modal");
    showToast('<span class="toast-title">✓ Access policy saved</span>RBAC change recorded in Audit Logs. (Demo — no backend.)');
    viewedUserId = null;
    manageAccessDirty = false;
  });

  // ─── Init ───
  renderVaultTable();
  renderAuditTable();
  renderDashboardActivity();
  renderEndpoints();
  renderUsersTable();
})();
