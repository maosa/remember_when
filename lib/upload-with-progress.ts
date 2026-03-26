/**
 * Uploads a file to a Supabase Storage signed upload URL obtained via
 * `createSignedUploadUrl`, using XMLHttpRequest so real upload progress events
 * are available (the Fetch API does not expose upload progress).
 *
 * The FormData body format mirrors what `@supabase/storage-js` v2 sends, so
 * the Storage API accepts the request without any additional configuration.
 *
 * @param signedUrl  Full signed URL returned by `createSignedUploadUrl` (token included)
 * @param file       The file to upload
 * @param onProgress Called with a 0–100 integer as bytes are transmitted
 */
export function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = new FormData()
    // storage-js sends cacheControl as a FormData field alongside the file
    body.append('cacheControl', '3600')
    // storage-js appends the file with an empty string as the field name
    body.append('', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve()
      } else {
        let msg = `Upload failed (${xhr.status})`
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string }
          if (parsed.message) msg = parsed.message
        } catch {
          // responseText wasn't JSON — keep the generic message
        }
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', signedUrl)
    xhr.send(body)
  })
}
