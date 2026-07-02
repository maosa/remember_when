import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MarkdownDocument } from '@/components/legal/markdown-document'

export const metadata: Metadata = {
  title: 'Privacy Policy — Remember When',
  description: 'How Remember When collects, uses, and protects your data.',
}

export default async function PrivacyPage() {
  const content = await readFile(
    path.join(process.cwd(), 'PRIVACY_POLICY.md'),
    'utf8',
  )

  return (
    <main className="min-h-screen bg-rw-bg flex flex-col">
      <header className="border-b border-rw-border-subtle px-6 py-5">
        <div className="max-w-[760px] mx-auto">
          <Link
            href="/"
            className="font-serif text-[16px] font-semibold text-rw-text-primary tracking-tight"
          >
            Remember When
          </Link>
        </div>
      </header>

      <div className="max-w-[760px] w-full mx-auto px-6 py-12 md:py-16 flex-1">
        <MarkdownDocument content={content} />

        <div className="mt-12 pt-6 border-t border-rw-border-subtle">
          <Link
            href="/terms"
            className="text-[14px] text-rw-accent underline underline-offset-2 hover:text-rw-accent-hover transition-colors"
          >
            Read our Terms of Service →
          </Link>
        </div>
      </div>
    </main>
  )
}
