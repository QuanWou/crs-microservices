import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createApiKey, getApiKeys, revokeApiKey } from '../api/apiKeyApi'
import { useToast } from '../components/Toast'
import type { ApiErrorResponse } from '../types/apiError'
import type { ApiKey, ApiKeyScope } from '../types/apiKey'

const AVAILABLE_SCOPES: { value: ApiKeyScope; label: string }[] = [
  { value: 'courses:read', label: 'Xem danh sách môn học đối tác' },
  { value: 'courses:read-detail', label: 'Xem chi tiết một môn học' },
]

function serverMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback
  }
  return fallback
}

export default function ApiKeysPage() {
  const { showToast } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>(['courses:read'])
  const [validDays, setValidDays] = useState('30')
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getApiKeys()
      setKeys(response.data)
    } catch (requestError) {
      setError(serverMessage(requestError, 'Không tải được danh sách API Key.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadKeys() }, [loadKeys])

  const formError = useMemo(() => {
    if (!ownerName.trim()) return 'Tên đối tác không được để trống.'
    if (selectedScopes.length === 0) return 'Phải chọn ít nhất một scope.'
    if (validDays && (!Number.isInteger(Number(validDays)) || Number(validDays) <= 0)) {
      return 'Số ngày hiệu lực phải là số nguyên lớn hơn 0.'
    }
    return null
  }, [ownerName, selectedScopes, validDays])

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((current) => current.includes(scope)
      ? current.filter((item) => item !== scope)
      : [...current, scope])
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNewKeyValue(null)
    if (formError) {
      setError(formError)
      return
    }

    setSubmitting(true)
    try {
      const response = await createApiKey({
        ownerName: ownerName.trim(),
        scopes: selectedScopes.join(','),
        validDays: validDays ? Number(validDays) : undefined,
      })
      setNewKeyValue(response.data.keyValue)
      setOwnerName('')
      showToast('Cấp API Key thành công.')
      await loadKeys()
    } catch (requestError) {
      setError(serverMessage(requestError, 'Cấp API Key không thành công.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (key: ApiKey) => {
    if (!window.confirm(`Thu hồi API Key của “${key.ownerName}”?`)) return
    setError(null)
    try {
      await revokeApiKey(key.id)
      showToast('Đã thu hồi API Key.')
      await loadKeys()
    } catch (requestError) {
      const message = serverMessage(requestError, 'Thu hồi API Key không thành công.')
      setError(message)
      showToast(message, 'error')
    }
  }

  return <main className="app-shell">
    <header className="page-header">
      <p className="eyebrow">CRS · Quản trị bảo mật</p>
      <h1>Quản lý API Key</h1>
      <p>Cấp quyền truy cập API đối tác, đặt hạn sử dụng và thu hồi key mà không cần khởi động lại hệ thống.</p>
    </header>

    <section className="catalog-card api-key-layout">
      <form className="api-key-form" onSubmit={handleCreate} noValidate>
        <div className="form-heading">
          <h2>Cấp API Key mới</h2>
          <p>Giá trị bí mật chỉ được hiển thị một lần ngay sau khi tạo.</p>
        </div>

        <label>Tên đối tác
          <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} placeholder="Ví dụ: Công ty ABC Edu" />
        </label>

        <fieldset>
          <legend>Phạm vi quyền</legend>
          {AVAILABLE_SCOPES.map((scope) => <label className="scope-option" key={scope.value}>
            <input type="checkbox" checked={selectedScopes.includes(scope.value)} onChange={() => toggleScope(scope.value)} />
            <span><strong>{scope.value}</strong><small>{scope.label}</small></span>
          </label>)}
        </fieldset>

        <label>Hiệu lực (ngày)
          <input type="number" min="1" step="1" value={validDays} onChange={(event) => setValidDays(event.target.value)} placeholder="Để trống nếu không giới hạn" />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang cấp...' : 'Cấp API Key'}</button>
      </form>

      {newKeyValue && <div className="api-key-secret" role="status">
        <strong>Key vừa tạo — hãy sao chép và lưu lại ngay</strong>
        <p>Key này sẽ không xuất hiện lại trong danh sách.</p>
        <code>{newKeyValue}</code>
        <button className="secondary-button" type="button" onClick={async () => {
          await navigator.clipboard.writeText(newKeyValue)
          showToast('Đã sao chép API Key.')
        }}>Sao chép</button>
      </div>}

      <div className="api-key-list-heading">
        <h2>API Key đã cấp</h2>
        <span>{keys.length} key</span>
      </div>

      {loading ? <div className="loading-state"><span className="loader" /><p>Đang tải danh sách...</p></div> :
        keys.length === 0 ? <div className="feedback-state"><p>Chưa có API Key nào.</p></div> :
          <div className="course-table-wrap"><table className="course-table api-key-table">
            <thead><tr><th>Đối tác</th><th>Scopes</th><th>Trạng thái</th><th>Hết hạn</th><th>Thao tác</th></tr></thead>
            <tbody>{keys.map((key) => <tr key={key.id}>
              <td data-label="Đối tác"><span className="course-name">{key.ownerName}</span></td>
              <td data-label="Scopes"><code>{key.scopes}</code></td>
              <td data-label="Trạng thái"><span className={`key-status key-status-${key.status.toLowerCase()}`}>{key.status}</span></td>
              <td data-label="Hết hạn">{key.expiresAt ? new Date(key.expiresAt).toLocaleString('vi-VN') : 'Không giới hạn'}</td>
              <td data-label="Thao tác">{key.status === 'ACTIVE'
                ? <button className="table-button danger-button" type="button" onClick={() => void handleRevoke(key)}>Thu hồi</button>
                : <span>—</span>}</td>
            </tr>)}</tbody>
          </table></div>}
    </section>
  </main>
}
