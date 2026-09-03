export type ApiKeyStatus = 'ACTIVE' | 'REVOKED'
export type ApiKeyScope = 'courses:read' | 'courses:read-detail'

export interface ApiKey {
  id: number
  keyValue: string | null
  ownerName: string
  scopes: string
  status: ApiKeyStatus
  expiresAt: string | null
  createdAt: string
}

export interface ApiKeyCreateRequest {
  ownerName: string
  scopes: string
  validDays?: number
}
