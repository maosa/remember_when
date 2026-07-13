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
  'image/gif',
] as const

// ─── Size limits ──────────────────────────────────────────────────────────────

/** Maximum upload size (bytes) for post media and cover photos — 100 MB. */
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024

/** Maximum upload size (bytes) for profile avatars — 10 MB. */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024

export const ALLOWED_MEDIA_TYPES = [
  // Images — widely supported, safe to process
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Videos — universally supported in modern browsers
  'video/mp4',
  'video/webm',
  // Audio — broad browser support; quicktime/.mov excluded (video container)
  'audio/mpeg',   // mp3
  'audio/wav',
  'audio/mp4',    // m4a
] as const

// ─── MIME → canonical extension map ──────────────────────────────────────────

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
  'video/mp4':  'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav':  'wav',
  'audio/mp4':  'm4a',
}

/** Returns a canonical file extension derived from the MIME type, never from the filename. */
export function safeExt(mimeType: string): string {
  return MIME_EXT[mimeType] ?? 'bin'
}

/**
 * Maps a MIME type to the `media_type` stored on post_media rows.
 * Anything that isn't a video/* or audio/* is treated as a photo (the media
 * validators guarantee only allowed image/video/audio types reach here).
 */
export function mediaTypeFromMime(mimeType: string): 'photo' | 'video' | 'audio' {
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'photo'
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateAvatarFile(file: File): string | null {
  return validateAvatarMimeType(file.type)
}

/** Same check as `validateAvatarFile` but accepts a plain MIME type string.
 *  Used by server actions that receive file metadata rather than a File object
 *  (the two-phase direct-upload flow). */
export function validateAvatarMimeType(mimeType: string): string | null {
  if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(mimeType)) {
    return 'Avatar must be a JPEG, PNG, or WebP image.'
  }
  return null
}

export function validateCoverFile(file: File): string | null {
  return validateCoverMimeType(file.type)
}

/** Same check as `validateCoverFile` but accepts a plain MIME type string.
 *  Used by server actions that receive file metadata rather than a File object
 *  (the two-phase direct-upload flow). */
export function validateCoverMimeType(mimeType: string): string | null {
  if (!(ALLOWED_COVER_TYPES as readonly string[]).includes(mimeType)) {
    return 'Cover photo must be a JPEG, PNG, WebP, or GIF image.'
  }
  return null
}

export function validateMediaFile(file: File): string | null {
  return validateMediaMimeType(file.type)
}

/** Same check as `validateMediaFile` but accepts a plain MIME type string.
 *  Useful in server actions that receive file metadata rather than a File object. */
export function validateMediaMimeType(mimeType: string): string | null {
  if (!(ALLOWED_MEDIA_TYPES as readonly string[]).includes(mimeType)) {
    return `Unsupported file type: ${mimeType || 'unknown'}. Supported formats: JPEG, PNG, WebP, GIF · MP4, WebM · MP3, WAV, M4A.`
  }
  return null
}
