import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      data: {
        service: 'auth-service',
        version: '1.0.0',
        endpoints: [
          'POST /register',
          'POST /verify-email',
          'POST /resend-verification',
          'POST /login',
          'POST /refresh',
          'POST /logout',
          'POST /logout-all',
          'POST /forgot-password',
          'POST /reset-password',
          'POST /change-password',
          'GET /me',
          'PATCH /me',
          'POST /admin/users',
        ],
      },
    };
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    };
  }
}
