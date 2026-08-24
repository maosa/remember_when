import { Wordmark } from '@/components/wordmark'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-rw-bg">
      <header className="shrink-0 border-b border-rw-border-subtle bg-rw-bg/95 backdrop-blur-sm">
        <div className="px-6 sm:px-10 h-14 flex items-center">
          <Wordmark href="/" />
        </div>
      </header>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}
