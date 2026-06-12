import Link from 'next/link'
import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

interface PillLinkProps {
  href: string
  children: React.ReactNode
  size?: Size
  className?: string
  style?: React.CSSProperties
}

const sizeClasses: Record<Size, string> = {
  sm: 'text-[13.5px] px-5 py-[9px]',
  md: 'text-[14.5px] px-[26px] py-3',
  lg: 'text-[15px] px-7 py-3.5',
}

export default function PillLink({ href, children, size = 'md', className, style }: PillLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 font-semibold text-white bg-rw-accent hover:bg-rw-accent-hover rounded-rw-pill transition-colors',
        sizeClasses[size],
        className,
      )}
      style={style}
    >
      {children}
    </Link>
  )
}
