import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from '../helpers/test-app';

describe('Security Headers Integration Tests', () => {
    let app: INestApplication;
    let httpServer: any;

    beforeAll(async () => {
        app = await createTestApp();
        httpServer = app.getHttpServer();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should set X-Content-Type-Options to nosniff', async () => {
        const response = await request(httpServer)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' });

        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options to DENY', async () => {
        const response = await request(httpServer)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' });

        expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-XSS-Protection to 1; mode=block', async () => {
        const response = await request(httpServer)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' });

        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should not have X-Powered-By header', async () => {
        const response = await request(httpServer)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'wrong' });

        expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should have all required security headers on any endpoint', async () => {
        const response = await request(httpServer)
            .post('/api/v1/auth/login')
            .send({ email: 'test@example.com', password: 'invalid' });

        // Regardless of response status, headers should be set
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
        expect(response.headers['x-powered-by']).toBeUndefined();
    });
});
