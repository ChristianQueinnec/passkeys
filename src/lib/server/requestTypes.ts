// requests/response types

// src/routes/api/csrf/
export interface CSRFResponse {
    csrfToken: string
}

// src/routes/api/login/
export interface LoginRequest {
    username: string,
    password: string
}

export interface LoginResponse {
    token: string,
    username: string
}

// src/routes/api/user/password/
export interface PasswordChangeRequest {
    oldPassword: string,
    newPassword: string
}

export interface PasswordChangeResponse {
    success: boolean,
    token: string,
    username: string
}

// src/routes/api/vault/metadata/
export interface NewerVaultResponse {
    mtime: string | null // date
}

// src/routes/api/vault/history/
export type VaultHistoryResponse = VaultDescription[];


export interface DeleteVaultResponse {
    success: boolean
}

// src/routes/api/vault/
export type LatestVaultResponse = VaultDescription;

export interface SaveVaultRequest {
    content: string
}

export interface SaveVaultResponse {
    success: boolean,
    filename: string
}

export interface VaultDescription {
    name: string,
    size: number,
    mtime: Date,
    isCiphered: boolean
}

export interface ErrorResponse {
    error: string
}
