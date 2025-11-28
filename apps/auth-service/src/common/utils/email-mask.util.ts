/**
 * Masks an email address for logging purposes.
 * Rules:
 * - Invalid email -> return as is
 * - Valid email:
 *   - user@example.com -> u***@example.com
 *   - u@example.com -> *@example.com
 *   - ab@example.com -> a***@example.com
 * 
 * @param email The email address to mask
 * @returns The masked email address
 */
export function maskEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        return email;
    }

    const atIndex = email.indexOf('@');
    if (atIndex === -1) {
        return email;
    }

    const username = email.substring(0, atIndex);
    const domain = email.substring(atIndex);

    if (username.length <= 1) {
        return `*${domain}`;
    }

    const firstChar = username.charAt(0);
    return `${firstChar}***${domain}`;
}
