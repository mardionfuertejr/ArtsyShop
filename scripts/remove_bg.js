const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function removePngBackground(inputPath, outputPath) {
  const buffer = fs.readFileSync(inputPath);

  // Validate PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    console.error('Not a valid PNG');
    return;
  }

  let offset = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  let idatBuffers = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      console.log(`PNG Info: ${width}x${height}, bitDepth: ${bitDepth}, colorType: ${colorType}`);
    } else if (type === 'IDAT') {
      idatBuffers.push(data);
    }
  }

  const compressedData = Buffer.concat(idatBuffers);
  const decompressed = zlib.inflateSync(compressedData);

  // colorType 6 is RGBA (4 bytes/pixel), colorType 2 is RGB (3 bytes/pixel)
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bytesPerPixel === 0 || bitDepth !== 8) {
    console.error('Unsupported color type/depth for simple converter:', colorType, bitDepth);
    return;
  }

  const stride = 1 + width * bytesPerPixel;
  const rawRgba = Buffer.alloc(height * width * 4);

  // Unfilter scanlines into standard RGBA
  let prevRow = Buffer.alloc(width * bytesPerPixel);
  let curRow = Buffer.alloc(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[y * stride];
    const rowData = decompressed.subarray(y * stride + 1, (y + 1) * stride);

    for (let i = 0; i < width * bytesPerPixel; i++) {
      const bpp = bytesPerPixel;
      const x = rowData[i];
      const a = i >= bpp ? curRow[i - bpp] : 0;
      const b = prevRow[i];
      const c = i >= bpp ? prevRow[i - bpp] : 0;

      if (filterType === 0) curRow[i] = x;
      else if (filterType === 1) curRow[i] = (x + a) & 0xff;
      else if (filterType === 2) curRow[i] = (x + b) & 0xff;
      else if (filterType === 3) curRow[i] = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
        curRow[i] = (x + pr) & 0xff;
      }
    }

    // Convert curRow to rawRgba
    for (let x = 0; x < width; x++) {
      const srcIdx = x * bytesPerPixel;
      const dstIdx = (y * width + x) * 4;
      const r = curRow[srcIdx];
      const g = curRow[srcIdx + 1];
      const b = curRow[srcIdx + 2];
      const a = bytesPerPixel === 4 ? curRow[srcIdx + 3] : 255;

      rawRgba[dstIdx] = r;
      rawRgba[dstIdx + 1] = g;
      rawRgba[dstIdx + 2] = b;
      rawRgba[dstIdx + 3] = a;
    }

    prevRow.set(curRow);
  }

  // Detect background color from the 4 corners
  const sampleCorner = (x, y) => {
    const idx = (y * width + x) * 4;
    return [rawRgba[idx], rawRgba[idx + 1], rawRgba[idx + 2]];
  };

  const c1 = sampleCorner(2, 2);
  const c2 = sampleCorner(width - 3, 2);
  const c3 = sampleCorner(2, height - 3);
  const c4 = sampleCorner(width - 3, height - 3);

  const bgR = Math.round((c1[0] + c2[0] + c3[0] + c4[0]) / 4);
  const bgG = Math.round((c1[1] + c2[1] + c3[1] + c4[1]) / 4);
  const bgB = Math.round((c1[2] + c2[2] + c3[2] + c4[2]) / 4);
  console.log(`Detected background color: RGB(${bgR}, ${bgG}, ${bgB})`);

  // Remove background with smooth antialiasing threshold
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = rawRgba[idx];
    const g = rawRgba[idx + 1];
    const b = rawRgba[idx + 2];

    const dist = Math.sqrt(
      (r - bgR) * (r - bgR) +
      (g - bgG) * (g - bgG) +
      (b - bgB) * (b - bgB)
    );

    // Color distance thresholds
    const innerThreshold = 18; // 100% transparent
    const outerThreshold = 45; // Smooth alpha falloff

    if (dist < innerThreshold) {
      rawRgba[idx + 3] = 0;
    } else if (dist < outerThreshold) {
      const alphaFactor = (dist - innerThreshold) / (outerThreshold - innerThreshold);
      rawRgba[idx + 3] = Math.round(255 * alphaFactor);
    }
  }

  // Encode back to PNG RGBA (colorType 6) with filter 0
  const outStride = 1 + width * 4;
  const outScanlines = Buffer.alloc(height * outStride);

  for (let y = 0; y < height; y++) {
    outScanlines[y * outStride] = 0; // None filter
    rawRgba.copy(outScanlines, y * outStride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const outCompressed = zlib.deflateSync(outScanlines, { level: 9 });

  // Build PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Simple CRC32 table
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', outCompressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const outPng = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, outPng);
  console.log(`Success! Saved transparent logo to: ${outputPath}`);
}

const input = path.join(__dirname, '../public/images/logo_m&m.png');
const output = path.join(__dirname, '../public/images/logo_m&m_transparent.png');
removePngBackground(input, output);
