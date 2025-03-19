/**
 * Utility functions for image processing
 */

/**
 * Generate a hash for an image blob to use as a cache key
 * @param blob The image blob to hash
 * @returns A Promise that resolves to a hash string
 */
export async function generateImageHash(blob: Blob): Promise<string> {
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer()
    // Use SubtleCrypto to create a hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer)
    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex
  }
  
  /**
   * Resize an image blob to the specified dimensions
   * @param blob The image blob to resize
   * @param width Target width
   * @param height Target height
   * @returns A Promise that resolves to a resized blob
   */
  export function resizeImageBlob(blob: Blob, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Create a canvas with the target dimensions
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
  
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }
  
        // Draw the image with proper scaling
        ctx.drawImage(img, 0, 0, width, height)
  
        // Convert to blob with proper format and quality
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob)
            } else {
              reject(new Error("Failed to convert canvas to blob"))
            }
          },
          "image/jpeg",
          0.95, // Quality setting
        )
      }
  
      img.onerror = () => reject(new Error("Failed to load image for resizing"))
  
      // Create object URL from blob
      img.src = URL.createObjectURL(blob)
    })
  }
  
  /**
   * Normalize image data to ensure consistent processing
   * @param blob The image blob to normalize
   * @returns A Promise that resolves to a normalized blob
   */
  export async function normalizeImage(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Create a canvas with the original dimensions
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")
  
        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }
  
        // Draw the image
        ctx.drawImage(img, 0, 0)
  
        // Get image data for normalization
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
  
        // Calculate min and max values for normalization
        let min = 255
        let max = 0
  
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
  
          // Use grayscale value for medical images
          const gray = 0.299 * r + 0.587 * g + 0.114 * b
  
          if (gray < min) min = gray
          if (gray > max) max = gray
        }
  
        // Normalize pixel values
        const range = max - min
  
        if (range > 0) {
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
  
            // Normalize each channel
            data[i] = ((r - min) / range) * 255
            data[i + 1] = ((g - min) / range) * 255
            data[i + 2] = ((b - min) / range) * 255
          }
        }
  
        // Put the normalized data back
        ctx.putImageData(imageData, 0, 0)
  
        // Convert to blob
        canvas.toBlob(
          (newBlob) => {
            if (newBlob) {
              resolve(newBlob)
            } else {
              reject(new Error("Failed to convert canvas to blob"))
            }
          },
          "image/jpeg",
          0.95,
        )
      }
  
      img.onerror = () => reject(new Error("Failed to load image for normalization"))
  
      // Create object URL from blob
      img.src = URL.createObjectURL(blob)
    })
  }
  
  /**
   * Convert a canvas element to a blob
   * @param canvas The canvas element to convert
   * @returns A Promise that resolves to a Blob
   */
  export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error("Failed to convert canvas to blob"))
          }
        },
        "image/jpeg",
        0.95,
      )
    })
  }
  
  