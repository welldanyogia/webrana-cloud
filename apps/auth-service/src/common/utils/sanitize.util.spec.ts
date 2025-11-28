import {
    sanitizeEmail,
    sanitizeFullName,
    sanitizePhoneNumber,
    sanitizeTimezone,
    sanitizeLanguage,
} from './sanitize.util';

describe('Sanitization Utilities', () => {
    describe('sanitizeEmail', () => {
        it('should trim and lowercase email', () => {
            expect(sanitizeEmail(' TEST@Email.COM ')).toBe('test@email.com');
        });

        it('should handle already clean email', () => {
            expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
        });

        it('should handle empty string', () => {
            expect(sanitizeEmail('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeEmail(null as any)).toBe(null);
            expect(sanitizeEmail(undefined as any)).toBe(undefined);
        });
    });

    describe('sanitizeFullName', () => {
        it('should escape HTML characters', () => {
            const result = sanitizeFullName("<script>alert('xss')</script>");
            expect(result).not.toContain('<script>');
            expect(result).not.toContain('</script>');
            expect(result).toContain('&lt;');
            expect(result).toContain('&gt;');
        });

        it('should trim whitespace', () => {
            expect(sanitizeFullName('  John Doe  ')).toBe('John Doe');
        });

        it('should escape and trim together', () => {
            const result = sanitizeFullName('  <b>Bold</b>  ');
            expect(result).not.toContain('<b>');
            expect(result).toContain('&lt;b&gt;');
        });

        it('should handle normal text', () => {
            expect(sanitizeFullName('John Doe')).toBe('John Doe');
        });

        it('should handle empty string', () => {
            expect(sanitizeFullName('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeFullName(null as any)).toBe(null);
            expect(sanitizeFullName(undefined as any)).toBe(undefined);
        });
    });

    describe('sanitizePhoneNumber', () => {
        it('should trim whitespace', () => {
            expect(sanitizePhoneNumber(' +62 812-3456-7890 ')).toBe('+62 812-3456-7890');
        });

        it('should handle already clean phone', () => {
            expect(sanitizePhoneNumber('+6281234567890')).toBe('+6281234567890');
        });

        it('should handle empty string', () => {
            expect(sanitizePhoneNumber('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizePhoneNumber(null as any)).toBe(null);
            expect(sanitizePhoneNumber(undefined as any)).toBe(undefined);
        });
    });

    describe('sanitizeTimezone', () => {
        it('should trim whitespace', () => {
            expect(sanitizeTimezone(' Asia/Jakarta ')).toBe('Asia/Jakarta');
        });

        it('should handle already clean timezone', () => {
            expect(sanitizeTimezone('America/New_York')).toBe('America/New_York');
        });

        it('should handle empty string', () => {
            expect(sanitizeTimezone('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeTimezone(null as any)).toBe(null);
            expect(sanitizeTimezone(undefined as any)).toBe(undefined);
        });
    });

    describe('sanitizeLanguage', () => {
        it('should trim and lowercase', () => {
            expect(sanitizeLanguage(' EN ')).toBe('en');
        });

        it('should handle already clean language code', () => {
            expect(sanitizeLanguage('id')).toBe('id');
        });

        it('should handle uppercase', () => {
            expect(sanitizeLanguage('FR')).toBe('fr');
        });

        it('should handle empty string', () => {
            expect(sanitizeLanguage('')).toBe('');
        });

        it('should handle non-string input', () => {
            expect(sanitizeLanguage(null as any)).toBe(null);
            expect(sanitizeLanguage(undefined as any)).toBe(undefined);
        });
    });
});
