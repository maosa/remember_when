/**
 * Upload validation utilities.
 *
 * All file type checks are performed against the MIME type reported by the browser
 * (file.type) rather than the file extension, preventing double-extension attacks
 * (e.g. malware.php.jpg). A canonical extension is derived from the MIME type so
 * the extension stored in the path can never be spoofed by the filename.
 */

// ─── Allowed MIME types ───────────────────────────────────────────────────────

export const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const ALLOWED_COVER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const ALLOWED_MEDIA_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/x-m4a',
] as const

// ─── MIME → canonical extension map ──────────────────────────────────────────

const MIME_EXT: Record<string, string> = {
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
  'image/gif':       'gif',
  'image/heic':      'heic',
  'image/heif':      'heif',
  'video/mp4':       'mp4',
  'video/webm':      'webm',
  'video/quicktime': 'mov',
  'audio/mpeg':      'mp3',
  'audio/wav':       'wav',
  'audio/ogg':       'ogg',
  'audio/mp4':       'm4a',
  'audio/aac':       'aac',
  'audio/x-m4a':     'm4a',
}

/** Returns a canonical file extension derived from the MIME type, never from the filename. */
export function safeExt(mimeType: string): string {
  return MIME_EXT[mimeType] ?? 'bin'
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateAvatarFile(file: File): string | null {
  if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return 'Avatar must be a JPEG, PNG, or WebP image.'
  }
  return null
}

export function validateCoverFile(file: File): string | null {
  if (!(ALLOWED_COVER_TYPES as readonly string[]).includes(file.type)) {
    return 'Cover photo must be a JPEG, PNG, or WebP image.'
  }
  return null
}

export function validateMediaFile(file: File): string | null {
  if (!(ALLOWED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
    return `Unsupported file type: ${file.type || 'unknown'}. Allowed types: images, videos, and audio files.`
  }
  return null
}
