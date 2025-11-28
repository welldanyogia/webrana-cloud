import { escape } from 'html-escaper';

/**
 * Sanitizes email by trimming whitespace and converting to lowercase
 * @param email - The email address to sanitize
 * @returns Sanitized email address
 */
export function sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
        return email;
    }
    return email.trim().toLowerCase();
}

/**
 * Sanitizes full name by trimming whitespace and escaping HTML characters
 * @param name - The full name to sanitize
 * @returns Sanitized full name
 */
export function sanitizeFullName(name: string): string {
    if (!name || typeof name !== 'string') {
        return name;
    }
    return escape(name.trim());
}

/**
 * Sanitizes phone number by trimming whitespace
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
        return phone;
    }
    return phone.trim();
}

/**
 * Sanitizes timezone by trimming whitespace
 * @param timezone - The timezone to sanitize
 * @returns Sanitized timezone
 */
export function sanitizeTimezone(timezone: string): string {
    if (!timezone || typeof timezone !== 'string') {
        return timezone;
    }
    return timezone.trim();
}

/**
 * Sanitizes language code by trimming whitespace and converting to lowercase
 * @param language - The language code to sanitize
 * @returns Sanitized language code
 */
export function sanitizeLanguage(language: string): string {
    if (!language || typeof language !== 'string') {
        return language;
    }
    return language.trim().toLowerCase();
}
