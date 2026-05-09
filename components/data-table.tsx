import Link from "next/link";
import { EmptyState, LinkButton } from "@/components/ui";

export type Column<T> = {
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
};

export function DataTable<T extends { id: string }>({
  title,
  actionHref,
  actionLabel,
  rows,
  columns,
  emptyTitle = "No records yet",
  emptyBody = "Create the first record to start building the operating history.",
  emptyActionHref,
  emptyActionLabel,
  detailBasePath,
  editBasePath
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  rows: T[];
  columns: Array<Column<T>>;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  detailBasePath?: string;
  editBasePath?: string;
}) {
  const tableId = `table-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="grid gap-5" data-table-workbench={tableId}>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold">{title}</h2>
        </div>
        {actionHref && actionLabel ? <LinkButton href={actionHref}>{actionLabel}</LinkButton> : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} actionHref={emptyActionHref ?? actionHref} actionLabel={emptyActionLabel ?? actionLabel} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white shadow-soft">
          {/* Toolbar */}
          <div className="grid gap-3 border-b border-border bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
            <input
              data-table-search
              className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={`Search ${title.toLowerCase()}...`}
              aria-label={`Search ${title}`}
            />
            <details className="relative">
              <summary className="cursor-pointer select-none rounded-md border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
                View options
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid w-72 gap-4 rounded-lg border border-border bg-white p-4 shadow-soft">
                {/* Sort by */}
                <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
                  Sort by
                  <select data-table-sort-select className="h-9 rounded-md border border-border px-2 text-sm font-normal normal-case text-foreground">
                    <option value="">Default order</option>
                    {columns.map((col, i) => (
                      <option key={col.header} value={`${i}:asc`}>{col.header} A-Z</option>
                    ))}
                    {columns.map((col, i) => (
                      <option key={col.header + "d"} value={`${i}:desc`}>{col.header} Z-A</option>
                    ))}
                  </select>
                </label>
                {/* Group by */}
                <label className="grid gap-1 text-xs font-bold uppercase text-muted-foreground">
                  Group by
                  <select data-table-group-select className="h-9 rounded-md border border-border px-2 text-sm font-normal normal-case text-foreground">
                    <option value="">No grouping</option>
                    {columns.map((col, i) => (
                      <option key={col.header} value={i}>{col.header}</option>
                    ))}
                  </select>
                </label>
                {/* Column visibility */}
                <div className="grid gap-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Columns</p>
                  {columns.map((col, i) => (
                    <label key={col.header} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        defaultChecked
                        data-col-toggle={i}
                        className="h-4 w-4 accent-primary"
                      />
                      {col.header}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Settings are saved in your browser for this table.</p>
              </div>
            </details>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table data-table-id={tableId} className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={col.header}
                      data-col-index={i}
                      className="cursor-pointer select-none px-4 py-3 font-bold hover:bg-muted/80"
                      data-sortable="true"
                    >
                      <span className="flex items-center gap-1">
                        {col.header}
                        <span data-sort-indicator={i} className="text-muted-foreground/50 text-xs">↕</span>
                      </span>
                    </th>
                  ))}
                  {(detailBasePath || editBasePath) && <th className="px-4 py-3 font-bold">Actions</th>}
                </tr>
              </thead>
              <tbody data-table-body>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={["border-t border-border", (detailBasePath || editBasePath) ? "cursor-pointer transition hover:bg-muted/50" : ""].join(" ")}
                    {...(detailBasePath ? { "data-row-href": `${detailBasePath}/${row.id}` } : {})}
                  >
                    {columns.map((col, i) => (
                      <td
                        key={col.header}
                        data-col-index={i}
                        data-sort-value={col.sortValue ? String(col.sortValue(row)) : ""}
                        className="px-4 py-3 align-top"
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                    {(detailBasePath || editBasePath) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {detailBasePath && (
                            <Link href={`${detailBasePath}/${row.id}`} className="font-semibold text-primary">
                              Open →
                            </Link>
                          )}
                          {editBasePath && (
                            <Link href={`${editBasePath}/${row.id}/edit`} className="rounded border border-border px-2 py-1 text-xs font-semibold hover:bg-muted">
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: `
(function(){
setTimeout(function(){
  var wb = document.querySelector('[data-table-workbench="${tableId}"]');
  if (!wb || wb.dataset.ready) return;
  wb.dataset.ready = "true";

  var table = wb.querySelector('[data-table-id="${tableId}"]');
  var tbody = table.querySelector('[data-table-body]');
  var storageKey = "dt2:${tableId}";
  var state = {};
  try { state = JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch(e) {}
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch(e) {} }

  // ── helpers ──────────────────────────────────────────────────────────────
  function allDataRows() {
    return Array.from(tbody.querySelectorAll('tr:not([data-group-header])'));
  }
  function sortVal(tr, colIdx) {
    var td = tr.querySelector('[data-col-index="' + colIdx + '"]');
    if (!td) return "";
    var sv = td.getAttribute('data-sort-value');
    if (sv && sv !== "") {
      var n = parseFloat(sv.replace(/[^0-9.-]/g,''));
      return isNaN(n) ? sv.toLowerCase() : n;
    }
    return (td.innerText || "").trim().toLowerCase();
  }

  // ── column visibility ────────────────────────────────────────────────────
  var hiddenCols = state.hidden || [];
  function applyVisibility() {
    wb.querySelectorAll('[data-col-toggle]').forEach(function(cb) {
      var idx = parseInt(cb.getAttribute('data-col-toggle'), 10);
      var visible = hiddenCols.indexOf(idx) === -1;
      cb.checked = visible;
      wb.querySelectorAll('[data-col-index="' + idx + '"]').forEach(function(el) {
        el.style.display = visible ? "" : "none";
      });
    });
  }
  wb.querySelectorAll('[data-col-toggle]').forEach(function(cb) {
    cb.addEventListener('change', function() {
      var idx = parseInt(cb.getAttribute('data-col-toggle'), 10);
      if (cb.checked) {
        hiddenCols = hiddenCols.filter(function(i){ return i !== idx; });
      } else {
        if (hiddenCols.indexOf(idx) === -1) hiddenCols.push(idx);
      }
      state.hidden = hiddenCols;
      save();
      applyVisibility();
    });
  });
  applyVisibility();

  // ── search ───────────────────────────────────────────────────────────────
  var searchInput = wb.querySelector('[data-table-search]');
  if (state.search) searchInput.value = state.search;
  function applySearch() {
    var q = searchInput.value.toLowerCase();
    allDataRows().forEach(function(tr) {
      tr.style.display = (!q || tr.innerText.toLowerCase().includes(q)) ? "" : "none";
    });
  }
  searchInput.addEventListener('input', function() {
    state.search = searchInput.value;
    save();
    applySearch();
    applyGrouping();
  });
  applySearch();

  // ── sort ─────────────────────────────────────────────────────────────────
  var sortCol = state.sortCol !== undefined ? state.sortCol : -1;
  var sortDir = state.sortDir || "asc";

  function updateSortIndicators() {
    wb.querySelectorAll('[data-sort-indicator]').forEach(function(el) {
      el.textContent = "↕";
      el.style.opacity = "0.3";
    });
    if (sortCol >= 0) {
      var ind = wb.querySelector('[data-sort-indicator="' + sortCol + '"]');
      if (ind) { ind.textContent = sortDir === "asc" ? "↑" : "↓"; ind.style.opacity = "1"; }
    }
  }

  function applySort() {
    if (sortCol < 0) return;
    var rows = allDataRows();
    rows.sort(function(a, b) {
      var av = sortVal(a, sortCol), bv = sortVal(b, sortCol);
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      var as = String(av), bs = String(bv);
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    rows.forEach(function(tr) { tbody.appendChild(tr); });
    updateSortIndicators();
  }

  // Column header click
  table.querySelectorAll('th[data-sortable]').forEach(function(th) {
    th.addEventListener('click', function() {
      var idx = parseInt(th.getAttribute('data-col-index'), 10);
      if (sortCol === idx) {
        if (sortDir === "asc") { sortDir = "desc"; }
        else { sortCol = -1; sortDir = "asc"; }
      } else {
        sortCol = idx; sortDir = "asc";
      }
      state.sortCol = sortCol; state.sortDir = sortDir; save();
      applySort();
      applyGrouping();
    });
  });

  // Sort select
  var sortSelect = wb.querySelector('[data-table-sort-select]');
  if (state.sortSelect) sortSelect.value = state.sortSelect;
  sortSelect.addEventListener('change', function() {
    state.sortSelect = sortSelect.value;
    if (sortSelect.value) {
      var parts = sortSelect.value.split(':');
      sortCol = parseInt(parts[0], 10); sortDir = parts[1] || "asc";
    } else { sortCol = -1; sortDir = "asc"; }
    state.sortCol = sortCol; state.sortDir = sortDir; save();
    applySort();
    applyGrouping();
  });
  if (sortCol >= 0) { applySort(); }
  updateSortIndicators();

  // ── grouping ─────────────────────────────────────────────────────────────
  var groupCol = state.groupCol !== undefined ? state.groupCol : -1;
  var groupSelect = wb.querySelector('[data-table-group-select]');
  if (groupCol >= 0) groupSelect.value = String(groupCol);

  function applyGrouping() {
    // Remove existing group headers
    tbody.querySelectorAll('[data-group-header]').forEach(function(el) { el.remove(); });
    if (groupCol < 0) return;
    var lastGroup = null;
    var colCount = table.querySelectorAll('thead th').length;
    allDataRows().forEach(function(tr) {
      if (tr.style.display === "none") return;
      var val = sortVal(tr, groupCol);
      var label = (tr.querySelector('[data-col-index="' + groupCol + '"]')?.innerText || String(val)).trim();
      if (label !== lastGroup) {
        lastGroup = label;
        var gr = document.createElement('tr');
        gr.setAttribute('data-group-header', '1');
        gr.style.cssText = 'background:#f1f5f9;';
        var td = document.createElement('td');
        td.setAttribute('colspan', String(colCount));
        td.style.cssText = 'padding:6px 16px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;border-top:2px solid #e2e8f0;';
        td.textContent = label || '-';
        gr.appendChild(td);
        tbody.insertBefore(gr, tr);
      }
    });
  }

  groupSelect.addEventListener('change', function() {
    groupCol = groupSelect.value !== "" ? parseInt(groupSelect.value, 10) : -1;
    state.groupCol = groupCol; save();
    applyGrouping();
  });
  applyGrouping();

  // ── row click navigation ─────────────────────────────────────────────────
  tbody.addEventListener('click', function(e) {
    var tr = e.target.closest('tr[data-row-href]');
    if (!tr) return;
    if (e.target.closest('a,button,input,select,form')) return;
    window.location.href = tr.getAttribute('data-row-href');
  });

}, 100);
})();
`
            }}
          />
        </div>
      )}
    </div>
  );
}
