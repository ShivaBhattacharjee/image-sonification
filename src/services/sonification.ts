/**
 * Sonification Service
 * 
 * Converts images to audio (WAV) and back with reconstruction.
 * 
 * Encoding Strategies:
 * 1. Full Quality: Stores raw RGBA pixels with deflate compression
 * 2. Compressed: Re-encodes image as JPEG and stores the file bytes directly
 * 
 * The compressed mode produces MUCH smaller files by leveraging
 * image compression (JPEG) before audio encoding.
 */

interface SonificationResult {
  audioBlob: Blob
  audioUrl: string
  sampleRate: number
  duration: number
  compressionRatio?: number
}

interface ReconstructionResult {
  imageBlob: Blob
  imageUrl: string
  width: number
  height: number
}

export type QualityMode = "full" | "compressed"

interface SonificationOptions {
  quality: QualityMode
  jpegQuality?: number // 0-1, default 0.8
}

const SAMPLE_RATE = 44100
const BITS_PER_SAMPLE = 16
const NUM_CHANNELS = 1

// Magic bytes to identify format
const MAGIC_FULL = 0x46554C4C // "FULL"
const MAGIC_JPEG = 0x4A504547 // "JPEG"

/**
 * Compresses data using deflate
 */
async function compressData(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)
  const stream = new Blob([buffer]).stream()
  const compressedStream = stream.pipeThrough(new CompressionStream("deflate"))
  const response = new Response(compressedStream)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Decompresses deflate data
 */
async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(data.length)
  new Uint8Array(buffer).set(data)
  const stream = new Blob([buffer]).stream()
  const decompressedStream = stream.pipeThrough(new DecompressionStream("deflate"))
  const response = new Response(decompressedStream)
  const blob = await response.blob()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Converts an image file to JPEG blob at specified quality
 */
async function imageToJpegBlob(file: File, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Failed to create JPEG blob"))
        },
        "image/jpeg",
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }

    img.src = url
  })
}

/**
 * Extracts raw pixel data from an image file
 */
async function extractRawPixelData(file: File): Promise<{
  width: number
  height: number
  data: Uint8Array
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("Failed to get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      URL.revokeObjectURL(url)

      resolve({
        width: img.width,
        height: img.height,
        data: new Uint8Array(imageData.data),
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }

    img.src = url
  })
}

/**
 * Converts a 32-bit integer to 4 bytes (little-endian)
 */
function int32ToBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  bytes[0] = value & 0xff
  bytes[1] = (value >> 8) & 0xff
  bytes[2] = (value >> 16) & 0xff
  bytes[3] = (value >> 24) & 0xff
  return bytes
}

/**
 * Converts 4 bytes to a 32-bit integer (little-endian)
 */
function bytesToInt32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)) >>> 0
  )
}

/**
 * Converts a 16-bit integer to 2 bytes (little-endian)
 */
function int16ToBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(2)
  bytes[0] = value & 0xff
  bytes[1] = (value >> 8) & 0xff
  return bytes
}

/**
 * Creates a WAV file header
 */
function createWavHeader(dataSize: number): Uint8Array {
  const header = new Uint8Array(44)
  const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8)
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8)

  header.set([0x52, 0x49, 0x46, 0x46], 0) // "RIFF"
  header.set(int32ToBytes(36 + dataSize), 4)
  header.set([0x57, 0x41, 0x56, 0x45], 8) // "WAVE"
  header.set([0x66, 0x6d, 0x74, 0x20], 12) // "fmt "
  header.set(int32ToBytes(16), 16)
  header.set(int16ToBytes(1), 20)
  header.set(int16ToBytes(NUM_CHANNELS), 22)
  header.set(int32ToBytes(SAMPLE_RATE), 24)
  header.set(int32ToBytes(byteRate), 28)
  header.set(int16ToBytes(blockAlign), 32)
  header.set(int16ToBytes(BITS_PER_SAMPLE), 34)
  header.set([0x64, 0x61, 0x74, 0x61], 36) // "data"
  header.set(int32ToBytes(dataSize), 40)

  return header
}

/**
 * Encodes a byte as a 16-bit PCM sample
 */
function byteToSample(byte: number): number {
  return (byte - 128) * 256
}

/**
 * Decodes a 16-bit PCM sample to a byte
 */
function sampleToByte(sample: number): number {
  const byte = Math.round(sample / 256) + 128
  return Math.max(0, Math.min(255, byte))
}

/**
 * Encodes bytes to WAV audio data
 */
function bytesToWav(data: Uint8Array, headerBytes: Uint8Array): Blob {
  const totalSamples = headerBytes.length + data.length
  const audioDataSize = totalSamples * 2
  const audioData = new Int16Array(totalSamples)

  // Encode header
  for (let i = 0; i < headerBytes.length; i++) {
    audioData[i] = byteToSample(headerBytes[i])
  }

  // Encode data
  for (let i = 0; i < data.length; i++) {
    audioData[headerBytes.length + i] = byteToSample(data[i])
  }

  const wavHeader = createWavHeader(audioDataSize)
  const wavData = new Uint8Array(audioData.buffer)

  const wavFile = new Uint8Array(wavHeader.length + wavData.length)
  wavFile.set(wavHeader, 0)
  wavFile.set(wavData, wavHeader.length)

  return new Blob([wavFile], { type: "audio/wav" })
}

/**
 * Converts an image file to a WAV audio file
 */
export async function imageToAudio(
  file: File,
  options: SonificationOptions = { quality: "compressed" }
): Promise<SonificationResult> {
  const { quality, jpegQuality = 0.7 } = options

  let dataToEncode: Uint8Array
  let headerBytes: Uint8Array
  let originalSize: number

  if (quality === "compressed") {
    // Convert to JPEG and use those bytes directly
    const jpegBlob = await imageToJpegBlob(file, jpegQuality)
    const jpegBuffer = await jpegBlob.arrayBuffer()
    const jpegData = new Uint8Array(jpegBuffer)
    
    originalSize = file.size
    
    // Header: magic (4) + jpeg length (4) = 8 bytes
    headerBytes = new Uint8Array(8)
    headerBytes.set(int32ToBytes(MAGIC_JPEG), 0)
    headerBytes.set(int32ToBytes(jpegData.length), 4)
    
    dataToEncode = jpegData
  } else {
    // Full quality: extract raw pixels, compress with deflate
    const rawData = await extractRawPixelData(file)
    const compressedPixels = await compressData(rawData.data)
    
    originalSize = rawData.data.length
    
    // Header: magic (4) + width (4) + height (4) + original size (4) = 16 bytes
    headerBytes = new Uint8Array(16)
    headerBytes.set(int32ToBytes(MAGIC_FULL), 0)
    headerBytes.set(int32ToBytes(rawData.width), 4)
    headerBytes.set(int32ToBytes(rawData.height), 8)
    headerBytes.set(int32ToBytes(originalSize), 12)
    
    dataToEncode = compressedPixels
  }

  const audioBlob = bytesToWav(dataToEncode, headerBytes)
  const audioUrl = URL.createObjectURL(audioBlob)
  const totalSamples = headerBytes.length + dataToEncode.length
  const duration = totalSamples / SAMPLE_RATE

  return {
    audioBlob,
    audioUrl,
    sampleRate: SAMPLE_RATE,
    duration,
    compressionRatio: originalSize / dataToEncode.length,
  }
}

/**
 * Reconstructs an image from a WAV audio file
 */
export async function audioToImage(file: File): Promise<ReconstructionResult> {
  const arrayBuffer = await file.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // Verify WAV header
  const riff = String.fromCharCode(
    dataView.getUint8(0),
    dataView.getUint8(1),
    dataView.getUint8(2),
    dataView.getUint8(3)
  )
  if (riff !== "RIFF") {
    throw new Error("Invalid WAV file: missing RIFF header")
  }

  // Find data chunk
  let offset = 12
  while (offset < arrayBuffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      dataView.getUint8(offset),
      dataView.getUint8(offset + 1),
      dataView.getUint8(offset + 2),
      dataView.getUint8(offset + 3)
    )
    const chunkSize = dataView.getUint32(offset + 4, true)

    if (chunkId === "data") {
      offset += 8
      break
    }
    offset += 8 + chunkSize
  }

  const samples = new Int16Array(arrayBuffer.slice(offset))

  // Read magic number (first 4 bytes/samples)
  const magicBytes = new Uint8Array(4)
  for (let i = 0; i < 4; i++) {
    magicBytes[i] = sampleToByte(samples[i])
  }
  const magic = bytesToInt32(magicBytes, 0)

  if (magic === MAGIC_JPEG) {
    // JPEG mode: header is 8 bytes
    const headerBytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
      headerBytes[i] = sampleToByte(samples[i])
    }
    
    const jpegLength = bytesToInt32(headerBytes, 4)
    
    // Extract JPEG data
    const jpegData = new Uint8Array(jpegLength)
    for (let i = 0; i < jpegLength; i++) {
      jpegData[i] = sampleToByte(samples[8 + i])
    }
    
    // Create blob from JPEG data
    const imageBlob = new Blob([jpegData], { type: "image/jpeg" })
    const imageUrl = URL.createObjectURL(imageBlob)
    
    // Get dimensions from the image
    const dimensions = await getImageDimensions(imageBlob)
    
    return {
      imageBlob,
      imageUrl,
      width: dimensions.width,
      height: dimensions.height,
    }
  } else if (magic === MAGIC_FULL) {
    // Full quality mode: header is 16 bytes
    const headerBytes = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
      headerBytes[i] = sampleToByte(samples[i])
    }
    
    const width = bytesToInt32(headerBytes, 4)
    const height = bytesToInt32(headerBytes, 8)
    const originalSize = bytesToInt32(headerBytes, 12)
    
    // Extract compressed data
    const compressedLength = samples.length - 16
    const compressedData = new Uint8Array(compressedLength)
    for (let i = 0; i < compressedLength; i++) {
      compressedData[i] = sampleToByte(samples[16 + i])
    }
    
    // Decompress
    const rawPixelData = await decompressData(compressedData)
    
    if (rawPixelData.length !== originalSize) {
      throw new Error(`Size mismatch: expected ${originalSize}, got ${rawPixelData.length}`)
    }
    
    // Create image from raw pixels
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Failed to get canvas context")
    
    const pixelData = new Uint8ClampedArray(new ArrayBuffer(rawPixelData.length))
    pixelData.set(rawPixelData)
    
    const imageData = new ImageData(pixelData, width, height)
    ctx.putImageData(imageData, 0, 0)
    
    const imageBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error("Failed to create image blob"))
        },
        "image/png",
        1.0
      )
    })
    
    return {
      imageBlob,
      imageUrl: URL.createObjectURL(imageBlob),
      width,
      height,
    }
  } else {
    // Legacy format (no magic, 12-byte header with raw uncompressed pixels)
    return handleLegacyFormat(samples)
  }
}

/**
 * Gets image dimensions from a blob
 */
async function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    
    img.src = url
  })
}

/**
 * Handles legacy format WAV files (backward compatibility)
 */
async function handleLegacyFormat(samples: Int16Array): Promise<ReconstructionResult> {
  const legacyHeader = new Uint8Array(12)
  for (let i = 0; i < 12; i++) {
    legacyHeader[i] = sampleToByte(samples[i])
  }
  
  const width = bytesToInt32(legacyHeader, 0)
  const height = bytesToInt32(legacyHeader, 4)
  const channels = bytesToInt32(legacyHeader, 8)
  
  if (width <= 0 || width > 32768 || height <= 0 || height > 32768) {
    throw new Error(`Invalid image dimensions: ${width}x${height}`)
  }
  
  const expectedSize = width * height * channels
  const pixelData = new Uint8ClampedArray(new ArrayBuffer(expectedSize))
  
  for (let i = 0; i < expectedSize; i++) {
    pixelData[i] = sampleToByte(samples[12 + i])
  }
  
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")
  
  const imageData = new ImageData(pixelData, width, height)
  ctx.putImageData(imageData, 0, 0)
  
  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Failed to create image blob"))
      },
      "image/png",
      1.0
    )
  })
  
  return {
    imageBlob,
    imageUrl: URL.createObjectURL(imageBlob),
    width,
    height,
  }
}

/**
 * Validates if a file is a valid sonified audio file
 */
export async function validateSonifiedAudio(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const dataView = new DataView(arrayBuffer)

    const riff = String.fromCharCode(
      dataView.getUint8(0),
      dataView.getUint8(1),
      dataView.getUint8(2),
      dataView.getUint8(3)
    )
    return riff === "RIFF"
  } catch {
    return false
  }
}

/**
 * Formats bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Formats duration to human-readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`
  }
  return `${secs}.${ms.toString().padStart(3, "0")}s`
}

export type { SonificationOptions }
