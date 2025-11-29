import { Injectable, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import {
    sanitizeEmail,
    sanitizeFullName,
    sanitizePhoneNumber,
    sanitizeTimezone,
    sanitizeLanguage,
} from '../utils/sanitize.util';

/**
 * Global pipe that sanitizes common input fields before validation
 * Applies to: email, full_name, phone_number, timezone, language
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        // Only process objects (request bodies)
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return value;
        }

        // Clone to avoid mutating original
        const sanitized = { ...value };

        // Sanitize email fields
        if (sanitized.email !== undefined) {
            sanitized.email = sanitizeEmail(sanitized.email);
        }

        // Sanitize full_name fields
        if (sanitized.full_name !== undefined) {
            sanitized.full_name = sanitizeFullName(sanitized.full_name);
        }

        // Sanitize phone_number fields
        if (sanitized.phone_number !== undefined) {
            sanitized.phone_number = sanitizePhoneNumber(sanitized.phone_number);
        }

        // Sanitize timezone fields
        if (sanitized.timezone !== undefined) {
            sanitized.timezone = sanitizeTimezone(sanitized.timezone);
        }

        // Sanitize language fields
        if (sanitized.language !== undefined) {
            sanitized.language = sanitizeLanguage(sanitized.language);
        }

        return sanitized;
    }
}
