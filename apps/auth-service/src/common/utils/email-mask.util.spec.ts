import { maskEmail } from './email-mask.util';

describe('Email Masking Utility', () => {
    it('should mask normal email correctly', () => {
        expect(maskEmail('user@example.com')).toBe('u***@example.com');
        expect(maskEmail('johndoe@gmail.com')).toBe('j***@gmail.com');
    });

    it('should mask short username correctly', () => {
        expect(maskEmail('a@example.com')).toBe('*@example.com');
        expect(maskEmail('b@domain.org')).toBe('*@domain.org');
    });

    it('should mask 2-character username correctly', () => {
        expect(maskEmail('ab@example.com')).toBe('a***@example.com');
    });

    it('should return invalid email as is', () => {
        expect(maskEmail('invalid-email')).toBe('invalid-email');
        expect(maskEmail('no-at-symbol.com')).toBe('no-at-symbol.com');
    });

    it('should handle empty string', () => {
        expect(maskEmail('')).toBe('');
    });

    it('should handle null/undefined', () => {
        expect(maskEmail(null as any)).toBe(null);
        expect(maskEmail(undefined as any)).toBe(undefined);
    });

    it('should handle non-string input', () => {
        expect(maskEmail(123 as any)).toBe(123);
    });
});
