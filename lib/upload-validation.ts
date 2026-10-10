const maxBytes = 5 * 1024 * 1024;
const begins = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);
const ends = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[bytes.length - signature.length + index] === value);
const ascii = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

function pngContents(bytes: Uint8Array): boolean {
  if (!begins(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) || bytes.length < 45) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = 8;
  let imageData = false;
  let first = true;
  while (pos + 12 <= bytes.length) {
    const size = view.getUint32(pos, false);
    if (size > bytes.length - pos - 12) return false;
    const type = ascii(bytes.subarray(pos + 4, pos + 8));
    if (first && (type !== 'IHDR' || size !== 13 || !view.getUint32(pos + 8, false) || !view.getUint32(pos + 12, false))) return false;
    first = false;
    if (type === 'IDAT') imageData = true;
    pos += size + 12;
    if (type === 'IEND') return size === 0 && imageData && pos === bytes.length;
  }
  return false;
}

function officeArchive(bytes: Uint8Array, required: string): boolean {
  if (!begins(bytes, [80, 75, 3, 4]) || bytes.length < 22) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let pos = bytes.length - 22; pos >= Math.max(0, bytes.length - 65557); pos--) {
    if (view.getUint32(pos, true) === 0x06054b50 && pos + 22 + view.getUint16(pos + 20, true) === bytes.length) {
      end = pos;
      break;
    }
  }
  if (end < 0 || view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) return false;
  const count = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  let pos = view.getUint32(end + 16, true);
  if (!count || count > 2000 || pos + centralSize !== end) return false;
  const names = new Set<string>();
  let totalExpanded = 0;
  for (let index = 0; index < count; index++) {
    if (pos + 46 > end || view.getUint32(pos, true) !== 0x02014b50) return false;
    const flags = view.getUint16(pos + 8, true);
    const compressed = view.getUint32(pos + 20, true);
    const expanded = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const next = pos + 46 + nameLength + extraLength + commentLength;
    if (next > end || localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50 || flags & 1) return false;
    const name = ascii(bytes.subarray(pos + 46, pos + 46 + nameLength));
    if (!name || name.startsWith('/') || name.includes('..') || name.includes('\\') || names.has(name) || /vbaProject\.bin$/i.test(name)) return false;
    names.add(name);
    totalExpanded += expanded;
    if (totalExpanded > 50 * 1024 * 1024 || (compressed === 0 && expanded !== 0) || (compressed > 0 && expanded / compressed > 200)) return false;
    pos = next;
  }
  return pos === end && names.has('[Content_Types].xml') && names.has(required);
}

export function validateUpload(mime: string, bytes: Uint8Array): { valid: boolean; reason?: string } {
  if (!bytes.length || bytes.length > maxBytes) return { valid: false, reason: 'File must be between 1 byte and 5 MB.' };
  let valid = false;
  if (mime === 'application/pdf') {
    const content = ascii(bytes);
    valid = content.startsWith('%PDF-') && content.lastIndexOf('%%EOF') >= bytes.length - 2048;
  } else if (mime === 'image/png') {
    valid = pngContents(bytes);
  } else if (mime === 'image/jpeg') {
    valid = begins(bytes, [255, 216, 255]) && ends(bytes, [255, 217]);
  } else if (mime === 'text/csv' || mime === 'text/plain') {
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      valid = !content.includes('\0') && !/[\x01-\x08\x0b\x0c\x0e-\x1f]/.test(content);
    } catch { valid = false; }
  } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    const marker = mime.includes('wordprocessingml') ? 'word/document.xml' : 'xl/workbook.xml';
    valid = officeArchive(bytes, marker);
  }
  return valid ? { valid: true } : { valid: false, reason: 'File content does not match the selected format.' };
}
