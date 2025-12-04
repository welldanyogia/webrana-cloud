'use client';

import * as Sentry from '@sentry/react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  statusCode?: number;
  statusText?: string;
}

/**
 * Generic error fallback component for displaying errors
 * Works with both Sentry ErrorBoundary and Next.js error pages
 */
function ErrorFallback({ error, resetError, statusCode, statusText }: ErrorFallbackProps) {
  const title = statusCode 
    ? `${statusCode} ${statusText || 'Error'}` 
    : 'Something went wrong';
  
  const description = statusCode === 404
    ? "The page you're looking for doesn't exist."
    : 'An unexpected error occurred. Our team has been notified.';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-muted rounded-md">
              <code className="text-sm text-muted-foreground break-all">
                {error.message}
              </code>
            </div>
          )}
          <div className="flex gap-2 justify-center">
            {resetError && (
              <Button onClick={resetError} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            <Button onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Sentry-wrapped error boundary for client-side error catching
 * Use this to wrap components that might throw errors
 */
export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  {
    fallback: ({ error, resetError }) => (
      <ErrorFallback error={error as Error} resetError={resetError} />
    ),
    showDialog: false,
  }
);

export { ErrorFallback };
