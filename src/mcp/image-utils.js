/**
 * Maximum allowed image payload size (4 MB).
 */
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

/**
 * Parses image header binary without native dependencies.
 * Supports PNG, JPEG, WebP, GIF.
 *
 * @param {Buffer} buffer
 * @returns {{ mimeType: string, width: number, height: number }}
 */
export function parseImageMetadata(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }
  if (buffer.length < 8) {
    throw new Error("Invalid image: file too small");
  }

  // 1. PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (buffer.length < 24) throw new Error("Invalid PNG: header truncated");
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width <= 0 || height <= 0) throw new Error("Invalid PNG dimensions");
    return { mimeType: "image/png", width, height };
  }

  // 2. GIF
  if (
    buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
    buffer.subarray(0, 6).toString("ascii") === "GIF89a"
  ) {
    if (buffer.length < 10) throw new Error("Invalid GIF: header truncated");
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    if (width <= 0 || height <= 0) throw new Error("Invalid GIF dimensions");
    return { mimeType: "image/gif", width, height };
  }

  // 3. JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2;
    while (offset < buffer.length) {
      while (offset < buffer.length && buffer[offset] === 0xff) {
        offset++;
      }
      if (offset >= buffer.length) break;
      const marker = buffer[offset];
      offset++;

      // Standalone markers without payload
      if (
        marker === 0xd8 || // SOI
        marker === 0xd9 || // EOI
        marker === 0x01 || // TEM
        (marker >= 0xd0 && marker <= 0xd7) // RSTn
      ) {
        continue;
      }

      if (offset + 2 > buffer.length) break;
      const length = buffer.readUInt16BE(offset);

      // Start Of Frame markers containing dimensions
      if (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
      ) {
        if (offset + 7 > buffer.length) break;
        const height = buffer.readUInt16BE(offset + 3);
        const width = buffer.readUInt16BE(offset + 5);
        if (width <= 0 || height <= 0) {
          throw new Error("Invalid JPEG dimensions");
        }
        return { mimeType: "image/jpeg", width, height };
      }

      offset += length;
    }
    throw new Error("Invalid JPEG: SOF segment not found");
  }

  // 4. WebP
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    const chunkType = buffer.subarray(12, 16).toString("ascii");
    if (chunkType === "VP8 ") {
      if (buffer.length < 30) throw new Error("Invalid VP8 WebP");
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      if (width <= 0 || height <= 0) throw new Error("Invalid VP8 dimensions");
      return { mimeType: "image/webp", width, height };
    } else if (chunkType === "VP8L") {
      if (buffer.length < 25) throw new Error("Invalid VP8L WebP");
      const b0 = buffer[21];
      const b1 = buffer[22];
      const b2 = buffer[23];
      const b3 = buffer[24];
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height =
        1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (width <= 0 || height <= 0) throw new Error("Invalid VP8L dimensions");
      return { mimeType: "image/webp", width, height };
    } else if (chunkType === "VP8X") {
      if (buffer.length < 30) throw new Error("Invalid VP8X WebP");
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      if (width <= 0 || height <= 0) throw new Error("Invalid VP8X dimensions");
      return { mimeType: "image/webp", width, height };
    }
    throw new Error(`Unsupported WebP chunk type: ${chunkType}`);
  }

  throw new Error(
    "Unsupported image format. Allowed formats: PNG, JPEG, WebP, GIF"
  );
}

/**
 * Decodes a base64 or Data URL image string and validates size and format.
 *
 * @param {string} dataBase64
 * @returns {{ buffer: Buffer, mimeType: string, width: number, height: number, byteLength: number }}
 */
export function decodeBase64Image(dataBase64) {
  if (typeof dataBase64 !== "string") {
    throw new Error("Image data must be a string");
  }

  const commaIndex = dataBase64.indexOf(",");
  const base64Str =
    dataBase64.startsWith("data:") && commaIndex !== -1
      ? dataBase64.slice(commaIndex + 1)
      : dataBase64;

  const buffer = Buffer.from(base64Str.trim(), "base64");
  if (buffer.length === 0) {
    throw new Error("Decoded image buffer is empty");
  }
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(
      `Image size exceeds maximum allowed size of 4MB (${buffer.length} bytes)`
    );
  }

  const { mimeType, width, height } = parseImageMetadata(buffer);
  return {
    buffer,
    mimeType,
    width,
    height,
    byteLength: buffer.length,
  };
}
