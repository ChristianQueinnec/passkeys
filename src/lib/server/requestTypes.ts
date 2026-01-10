// requests/response interfaces

// src/routes/api/csrf/
export interface CSRFTokenResponse {
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
// TODO not satisfactory! 
export interface LatestVaultResponse { // = VaultDescription;
    name: string,
    size: number,
    mtime: Date,
    isCiphered: boolean
}    

export interface SaveVaultRequest {
    content: string
}

export interface SaveVaultResponse {
    success: boolean,
    filename: string
}

export type VaultDescription = {
    name: string,
    size: number,
    mtime: Date,
    isCiphered: boolean
}

export interface ErrorResponse {
    error: string
}
