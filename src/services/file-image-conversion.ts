/**
 * File to Image Conversion Service
 * 
 * Converts any file to an image and back by encoding file bytes as pixels.
 * Uses a simple encoding scheme where each pixel stores file data.
 */

interface FileToImageResult {
  imageBlob: Blob
  imageUrl: string
  width: number
  height: number
  originalFileName: string
  originalFileSize: number
}

interface ImageToFileResult {
  fileBlob: Blob
  fileUrl: string
  fileName: string
  fileSize: number
  mimeType: string
}

// Magic bytes to identify our encoded images
const MAGIC_BYTES = new Uint8Array([0x46, 0x49, 0x4D, 0x47]) // "FIMG"
const HEADER_SIZE = 256 // Reserve 256 bytes for metadata

/**
 * Encodes file metadata and data into an image
 */
export async function fileToImage(file: File): Promise<FileToImageResult> {
  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)
  
  // Create metadata header
  const metadata = {
    magic: Array.from(MAGIC_BYTES),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
  }
  
  const metadataStr = JSON.stringify(metadata)
  const metadataBytes = new TextEncoder().encode(metadataStr)
  
  if (metadataBytes.length > HEADER_SIZE - 4) {
    throw new Error('File metadata too large')
  }
  
  // Create header: magic (4 bytes) + metadata length (4 bytes) + metadata + padding
  const header = new Uint8Array(HEADER_SIZE)
  header.set(MAGIC_BYTES, 0)
  
  const metadataLengthBytes = new Uint8Array(4)
  new DataView(metadataLengthBytes.buffer).setUint32(0, metadataBytes.length, true)
  header.set(metadataLengthBytes, 4)
  header.set(metadataBytes, 8)
  
  // Combine header and file data
  const totalData = new Uint8Array(HEADER_SIZE + fileData.length)
  totalData.set(header, 0)
  totalData.set(fileData, HEADER_SIZE)
  
  // Calculate image dimensions (3 bytes per pixel for RGB)
  const bytesPerPixel = 3
  const totalPixels = Math.ceil(totalData.length / bytesPerPixel)
  const width = Math.ceil(Math.sqrt(totalPixels))
  const height = Math.ceil(totalPixels / width)
  
  // Create canvas and encode data as pixels
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')
  
  const imageData = ctx.createImageData(width, height)
  const pixels = imageData.data
  
  // Encode data into pixels (RGB channels, alpha = 255)
  let dataIndex = 0
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = dataIndex < totalData.length ? totalData[dataIndex++] : 0     // R
    pixels[i + 1] = dataIndex < totalData.length ? totalData[dataIndex++] : 0 // G
    pixels[i + 2] = dataIndex < totalData.length ? totalData[dataIndex++] : 0 // B
    pixels[i + 3] = 255 // A
  }
  
  ctx.putImageData(imageData, 0, 0)
  
  // Convert to PNG (lossless)
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create image blob'))
      },
      'image/png',
      1.0
    )
  })
  
  return {
    imageBlob,
    imageUrl: URL.createObjectURL(imageBlob),
    width,
    height,
    originalFileName: file.name,
    originalFileSize: file.size,
  }
}

/**
 * Decodes an image back to the original file
 */
export async function imageToFile(imageFile: File): Promise<ImageToFileResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageFile)
    
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Failed to get canvas context'))
          return
        }
        
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const pixels = imageData.data
        
        // Extract data from pixels
        const extractedData: number[] = []
        for (let i = 0; i < pixels.length; i += 4) {
          extractedData.push(pixels[i])     // R
          extractedData.push(pixels[i + 1]) // G
          extractedData.push(pixels[i + 2]) // B
        }
        
        const dataBytes = new Uint8Array(extractedData)
        
        // Verify magic bytes
        const magic = dataBytes.slice(0, 4)
        if (!magic.every((byte, i) => byte === MAGIC_BYTES[i])) {
          URL.revokeObjectURL(url)
          reject(new Error('Invalid encoded image: magic bytes not found'))
          return
        }
        
        // Read metadata length
        const metadataLength = new DataView(dataBytes.buffer, dataBytes.byteOffset + 4, 4).getUint32(0, true)
        
        // Extract and parse metadata
        const metadataBytes = dataBytes.slice(8, 8 + metadataLength)
        const metadataStr = new TextDecoder().decode(metadataBytes)
        const metadata = JSON.parse(metadataStr)
        
        // Extract file data
        const fileData = dataBytes.slice(HEADER_SIZE, HEADER_SIZE + metadata.fileSize)
        
        const fileBlob = new Blob([fileData], { type: metadata.mimeType })
        const fileUrl = URL.createObjectURL(fileBlob)
        
        URL.revokeObjectURL(url)
        
        resolve({
          fileBlob,
          fileUrl,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize,
          mimeType: metadata.mimeType,
        })
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * Validates if an image contains encoded file data
 */
export async function validateEncodedImage(imageFile: File): Promise<boolean> {
  try {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(imageFile)
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.min(img.width, 10)
        canvas.height = Math.min(img.height, 10)
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve(false)
          return
        }
        
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const pixels = imageData.data
        
        // Check magic bytes
        const isValid = pixels[0] === MAGIC_BYTES[0] &&
                       pixels[1] === MAGIC_BYTES[1] &&
                       pixels[2] === MAGIC_BYTES[2] &&
                       pixels[4] === MAGIC_BYTES[3]
        
        URL.revokeObjectURL(url)
        resolve(isValid)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(false)
      }
      
      img.src = url
    })
  } catch {
    return false
  }
}
