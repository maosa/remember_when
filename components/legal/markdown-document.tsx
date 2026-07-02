import Link from 'next/link'
import type { ComponentPropsWithoutRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders a legal markdown document (Terms / Privacy) with platform theming.
 *
 * Element styling maps onto the `rw-*` design tokens so the page follows the
 * signed-in user's selected theme (applied via `data-theme` on <html> in the
 * root layout) without needing the Tailwind typography plugin.
 *
 * In-repo cross-links between the two documents (`./PRIVACY_POLICY.md`,
 * `./TERMS_OF_SERVICE.md`) are rewritten to their live routes; external links
 * open in a new tab.
 */

const DOC_LINK_MAP: Record<string, string> = {
  './PRIVACY_POLICY.md': '/privacy',
  './TERMS_OF_SERVICE.md': '/terms',
  'PRIVACY_POLICY.md': '/privacy',
  'TERMS_OF_SERVICE.md': '/terms',
}

function Anchor({ href = '', children, ...props }: ComponentPropsWithoutRef<'a'>) {
  const mapped = DOC_LINK_MAP[href]
  const className = 'text-rw-accent underline underline-offset-2 hover:text-rw-accent-hover transition-colors'

  if (mapped) {
    return (
      <Link href={mapped} className={className}>
        {children}
      </Link>
    )
  }

  const isExternal = /^https?:\/\//.test(href)
  return (
    <a
      href={href}
      className={className}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    >
      {children}
    </a>
  )
}

export function MarkdownDocument({ content }: { content: string }) {
  return (
    <div className="space-y-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-serif text-[30px] md:text-[34px] font-semibold text-rw-text-primary tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-serif text-[21px] font-semibold text-rw-text-primary tracking-tight mt-10 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-sans text-[15px] font-semibold text-rw-text-primary mt-6">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-relaxed text-rw-text-muted">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-rw-text-muted marker:text-rw-text-placeholder">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1.5 text-[15px] leading-relaxed text-rw-text-muted marker:text-rw-text-placeholder">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-rw-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: Anchor,
          hr: () => <hr className="my-8 border-rw-border-subtle" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-rw-border pl-4 text-rw-text-muted italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px] text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          th: ({ children }) => (
            <th className="border border-rw-border-subtle bg-rw-surface px-3 py-2 font-semibold text-rw-text-primary align-top">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-rw-border-subtle px-3 py-2 text-rw-text-muted align-top">
              {children}
            </td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-rw-surface px-1.5 py-0.5 text-[13px] text-rw-text-primary">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
