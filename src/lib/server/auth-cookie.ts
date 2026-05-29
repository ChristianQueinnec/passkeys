export const AUTH_COOKIE_NAME = 'passkeys_auth';

export function getCookieValue(header: string | null, name: string): string | null {
    if (!header) return null;

    const cookies = header.split(';');
    for (const cookie of cookies) {
        const [rawName, ...rawValueParts] = cookie.trim().split('=');
        if (rawName !== name) continue;
        const rawValue = rawValueParts.join('=');
        return rawValue ? decodeURIComponent(rawValue) : '';
    }

    return null;
}

export function getAuthTokenFromRequest(request: Request): string | null {
    return getCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);
}
