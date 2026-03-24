import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-rw-bg">
      <header className="shrink-0 border-b border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center">
          <Link
            href="/"
            className="font-serif text-[18px] font-semibold text-rw-text-primary tracking-tight hover:text-rw-accent transition-colors"
          >
            Remember When
          </Link>
        </div>
      </header>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}
