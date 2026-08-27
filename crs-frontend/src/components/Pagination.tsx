interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

function getVisiblePages(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index)
  }

  const pages: PageItem[] = [0]
  const rangeStart = Math.max(1, currentPage - 1)
  const rangeEnd = Math.min(totalPages - 2, currentPage + 1)

  if (rangeStart > 1) {
    pages.push('ellipsis-start')
  }

  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    pages.push(page)
  }

  if (rangeEnd < totalPages - 2) {
    pages.push('ellipsis-end')
  }

  pages.push(totalPages - 1)
  return pages
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const visiblePages = getVisiblePages(currentPage, totalPages)

  return (
    <nav className="pagination" aria-label="Phân trang danh sách môn học">
      <button
        className="pagination-direction"
        type="button"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <span aria-hidden="true">←</span>
        <span className="direction-label">Trang trước</span>
      </button>

      <div className="pagination-pages">
        {visiblePages.map((item) =>
          typeof item === 'number' ? (
            <button
              className={item === currentPage ? 'is-active' : ''}
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              aria-current={item === currentPage ? 'page' : undefined}
              aria-label={`Trang ${item + 1}`}
            >
              {item + 1}
            </button>
          ) : (
            <span className="pagination-ellipsis" key={item} aria-hidden="true">
              …
            </span>
          ),
        )}
      </div>

      <button
        className="pagination-direction"
        type="button"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <span className="direction-label">Trang sau</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}
