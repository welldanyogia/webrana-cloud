import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-block">
            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Webrana Cloud
            </span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Title */}
          <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>

        {/* Card */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-[var(--card-bg)] py-8 px-6 shadow-sm rounded-xl border border-[var(--border)] sm:px-10">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-[var(--text-muted)]">
          © {new Date().getFullYear()} Webrana Cloud. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
