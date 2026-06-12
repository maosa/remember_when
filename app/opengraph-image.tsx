import { ImageResponse } from 'next/og'

export const alt = 'Remember When — A shared memory book for the moments that matter.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#F5F2ED',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        {/* Sage accent line */}
        <div style={{ width: 48, height: 2, background: '#5C7A6B', marginBottom: 36, borderRadius: 1 }} />

        <div
          style={{
            fontSize: 76,
            fontWeight: 600,
            color: '#2C2A25',
            letterSpacing: '-0.02em',
            marginBottom: 28,
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
            textAlign: 'center',
          }}
        >
          Remember When
        </div>

        <div
          style={{
            fontSize: 26,
            color: '#7C7670',
            textAlign: 'center',
            maxWidth: 680,
            lineHeight: 1.6,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          A shared memory book for the moments that matter.
        </div>

        {/* Gold accent line */}
        <div style={{ width: 48, height: 2, background: '#C89840', marginTop: 40, borderRadius: 1, opacity: 0.5 }} />
      </div>
    ),
    { ...size },
  )
}
