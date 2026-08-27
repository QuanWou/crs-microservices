import { useEffect, useId, useState } from 'react'

interface SearchBoxProps {
  onSearch: (keyword: string) => void
  placeholder?: string
}

export default function SearchBox({
  onSearch,
  placeholder = 'Tìm kiếm theo tên môn học...',
}: SearchBoxProps) {
  const inputId = useId()
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearch(inputValue.trim())
    }, 450)

    return () => window.clearTimeout(timer)
  }, [inputValue, onSearch])

  const clearSearch = () => {
    setInputValue('')
    onSearch('')
  }

  return (
    <div className="search-field">
      <label className="sr-only" htmlFor={inputId}>
        Tìm kiếm môn học
      </label>
      <span className="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
        </svg>
      </span>
      <input
        id={inputId}
        type="search"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {inputValue && (
        <button
          className="clear-search"
          type="button"
          onClick={clearSearch}
          aria-label="Xóa từ khóa tìm kiếm"
        >
          ×
        </button>
      )}
    </div>
  )
}
