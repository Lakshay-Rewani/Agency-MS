/**
 * Pagination Component
 */
export default function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        Page {page} of {totalPages} ({total} records)
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          ← Prev
        </button>
        {start > 1 && (
          <>
            <button className="pagination-btn" onClick={() => onPageChange(1)}>1</button>
            {start > 2 && <span className="text-muted">...</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-muted">...</span>}
            <button className="pagination-btn" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
