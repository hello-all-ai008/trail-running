const EDGE_COUNT = 1
const SIBLING_COUNT = 1
const ELLIPSIS = '…'

/**
 * Numbered page list with first/last always visible, an ellipsis for gaps,
 * and the current page ± SIBLING_COUNT shown in full — the standard windowed
 * pagination pattern, kept a pure function so it's trivial to reason about.
 * @param {number} page
 * @param {number} totalPages
 * @returns {Array<number | typeof ELLIPSIS>}
 */
function pageList(page, totalPages) {
  const pages = []
  for (let p = 1; p <= totalPages; p++) {
    const isEdge = p <= EDGE_COUNT || p > totalPages - EDGE_COUNT
    const isSibling = Math.abs(p - page) <= SIBLING_COUNT
    if (isEdge || isSibling) {
      pages.push(p)
    } else if (pages[pages.length - 1] !== ELLIPSIS) {
      pages.push(ELLIPSIS)
    }
  }
  return pages
}

/**
 * Numbered pagination control. Prev/next arrows plus page numbers, current
 * page highlighted like an active filter chip (`btn-accent`).
 * @param {{ page: number, totalPages: number, onChange: (page: number) => void }} props
 */
function Pagination({ page, totalPages, onChange }) {
  return (
    <nav className="pagination" aria-label="หน้าตาราง">
      <button
        type="button"
        className="btn btn-sm btn-secondary pagination__arrow"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="หน้าก่อนหน้า"
      >
        ‹
      </button>

      {pageList(page, totalPages).map((p, i) =>
        p === ELLIPSIS ? (
          <span key={`ellipsis-${i}`} className="pagination__ellipsis">{ELLIPSIS}</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`btn btn-sm ${p === page ? 'btn-accent' : 'btn-secondary'}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="btn btn-sm btn-secondary pagination__arrow"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="หน้าถัดไป"
      >
        ›
      </button>
    </nav>
  )
}

export default Pagination
