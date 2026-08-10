const LEADING_COUNT = 4
const ELLIPSIS = '…'

/**
 * Sequential leading run (1..LEADING_COUNT) plus the last page, with an
 * ellipsis between them when there's an actual gap. Fixed regardless of the
 * current page — no sibling-window shifting as you navigate.
 * @param {number} totalPages
 * @returns {Array<number | typeof ELLIPSIS>}
 */
function pageList(totalPages) {
  if (totalPages <= LEADING_COUNT + 1) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const leading = Array.from({ length: LEADING_COUNT }, (_, i) => i + 1)
  return [...leading, ELLIPSIS, totalPages]
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

      <div className="pagination__pages">
        {pageList(totalPages).map((p, i) =>
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
      </div>

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
