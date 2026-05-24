/**
 * Validate base64 image sizes in request body.
 * If any image exceeds 1MB, returns validation result with error.
 */
export function validateBase64ImageSizes(body: any): { valid: boolean; error?: string } {
  if (!body || !body.messages || !Array.isArray(body.messages)) {
    return { valid: true };
  }

  const MAX_SIZE_BYTES = 1024 * 1024; // 1MB

  for (let i = 0; i < body.messages.length; i++) {
    const msg = body.messages[i];
    if (msg && Array.isArray(msg.content)) {
      for (let j = 0; j < msg.content.length; j++) {
        const part = msg.content[j];
        if (part && typeof part === 'object' && part.type === 'image_url' && part.image_url?.url) {
          const url: string = part.image_url.url;
          if (url.startsWith('data:')) {
            const commaIdx = url.indexOf(',');
            if (commaIdx !== -1) {
              const base64Data = url.slice(commaIdx + 1);
              // Calculate approximate size in bytes: base64 length * 0.75
              const approximateBytes = Math.ceil((base64Data.length * 3) / 4);
              if (approximateBytes > MAX_SIZE_BYTES) {
                const sizeInMB = (approximateBytes / (1024 * 1024)).toFixed(2);
                return {
                  valid: false,
                  error: `Base64 image size exceeds the limit of 1MB (current size: ${sizeInMB}MB).`
                };
              }
            }
          }
        }
      }
    }
  }

  return { valid: true };
}
