// requests/response interfaces

// src/routes/api/csrf/
export interface CSRFTokenResponse {
    csrfToken: string
}

// src/routes/api/login/
export interface LoginRequest {
    username: string,
    password: string,
    trustDevice?: boolean
}

export interface LoginResponse {
    username: string,
    csrfToken?: string
}

// src/routes/api/user/password/
export interface PasswordChangeRequest {
    oldPassword: string,
    newPassword: string
}

export interface PasswordChangeResponse {
    success: boolean,
    username: string
}

export interface SessionResponse {
    username: string
}

// src/routes/api/vault/metadata/
export interface NewerVaultResponse {
    mtime: string | null // Date
}

// src/routes/api/vault/history/
export interface VaultHistoryResponse {
    vaults: VaultDescription[]
}

export interface DeleteVaultResponse {
    success: boolean
}

// src/routes/api/vault/
export interface SaveVaultRequest {
    content: string
}

export interface SaveVaultResponse {
    success: boolean,
    filename: string
}

/**
 * Describes a vault file stored on the server.
 * Note: mtime is an ISO 8601 date string (not Date object) due to JSON serialization.
 */
export type VaultDescription = {
    name: string,
    size: number,
    mtime: string, // ISO 8601 date string
    isCiphered: boolean
}

export interface ErrorResponse {
    error: string
}
