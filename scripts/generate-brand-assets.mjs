import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const currentFile = fileURLToPath(import.meta.url);
const projectDir = resolve(dirname(currentFile), "..");
const publicDir = resolve(projectDir, "frontend", "public");
const cmdDir = resolve(projectDir, "cmd", "classdrive");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-labelledby="title desc">
  <title id="title">ClassDrive</title>
  <desc id="desc">A classroom file drive logo with a folder, document pages, and an upload arrow.</desc>
  <defs>
    <linearGradient id="bg" x1="18" y1="10" x2="82" y2="88" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f62fe"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
    <linearGradient id="folder" x1="20" y1="30" x2="76" y2="76" gradientUnits="userSpaceOnUse">
      <stop stop-color="#eff6ff"/>
      <stop offset="1" stop-color="#bfdbfe"/>
    </linearGradient>
    <linearGradient id="page" x1="36" y1="24" x2="64" y2="66" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" rx="24" fill="url(#bg)"/>
  <path fill="#083344" fill-opacity=".16" d="M21 38c0-5 4-9 9-9h13l7 7h18c5 0 9 4 9 9v23c0 5-4 9-9 9H30c-5 0-9-4-9-9V38Z"/>
  <path fill="#e0f2fe" d="M23 36c0-4.4 3.6-8 8-8h13.8l6.7 7H68c4.4 0 8 3.6 8 8v5H23V36Z"/>
  <path fill="url(#folder)" d="M20 45c0-4.4 3.6-8 8-8h40c4.4 0 8 3.6 8 8v23c0 4.4-3.6 8-8 8H28c-4.4 0-8-3.6-8-8V45Z"/>
  <path fill="url(#page)" stroke="#93c5fd" stroke-width="2" d="M35 21h20l12 12v31c0 3.3-2.7 6-6 6H35c-3.3 0-6-2.7-6-6V27c0-3.3 2.7-6 6-6Z"/>
  <path fill="#bfdbfe" d="M55 21v10c0 2.2 1.8 4 4 4h8L55 21Z"/>
  <path stroke="#0f62fe" stroke-linecap="round" stroke-width="4" d="M38 43h18M38 52h14"/>
  <path fill="#0f766e" d="M50 45a3 3 0 0 1 4.2 0l13 13a3 3 0 0 1-4.2 4.2L55 54.2V79a3 3 0 1 1-6 0V54.2l-8 8a3 3 0 0 1-4.2-4.2l13-13Z"/>
  <path fill="#ecfeff" d="M52 45.9 64.1 58a1.5 1.5 0 0 1-2.1 2.1l-8.5-8.5V79a1.5 1.5 0 0 1-3 0V51.6L42 60.1a1.5 1.5 0 0 1-2.1-2.1L52 45.9Z"/>
</svg>
`;

mkdirSync(publicDir, { recursive: true });
mkdirSync(cmdDir, { recursive: true });
writeFileSync(resolve(publicDir, "logo.svg"), svg, "utf8");
writeFileSync(resolve(publicDir, "favicon.svg"), svg, "utf8");

const iconSizes = [16, 24, 32, 48, 64, 128, 256];
const pngImages = iconSizes.map((size) => ({ size, png: renderPng(size) }));
const ico = buildIco(pngImages);
writeFileSync(resolve(publicDir, "favicon.ico"), ico);
writeFileSync(resolve(cmdDir, "classdrive.ico"), ico);
writeFileSync(resolve(cmdDir, "classdrive_windows_amd64.syso"), buildSyso(ico));

function renderPng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const coverage = roundedRectCoverage(x, y, size, size * 0.24);
      if (coverage <= 0) {
        continue;
      }

      const [br, bg, bb] = mix([15, 98, 254], [15, 118, 110], (x + y) / (2 * (size - 1)));
      setPixel(pixels, idx, br, bg, bb, Math.round(coverage * 255));

      const px = x / size;
      const py = y / size;
      if (inFolderBack(px, py)) {
        setPixel(pixels, idx, 224, 242, 254, 255);
      }
      if (inFolderFront(px, py)) {
        const [fr, fg, fb] = mix([239, 246, 255], [191, 219, 254], py);
        setPixel(pixels, idx, fr, fg, fb, 255);
      }
      if (inPage(px, py)) {
        const [pr, pg, pb] = mix([255, 255, 255], [219, 234, 254], py);
        setPixel(pixels, idx, pr, pg, pb, 255);
      }
      if (inPageFold(px, py)) {
        setPixel(pixels, idx, 191, 219, 254, 255);
      }
      if (inPageLine(px, py)) {
        setPixel(pixels, idx, 15, 98, 254, 255);
      }
      if (inArrow(px, py)) {
        setPixel(pixels, idx, 236, 254, 255, 255);
      }
    }
  }
  return encodePng(size, size, pixels);
}

function roundedRectCoverage(x, y, size, radius) {
  const inset = 0.5;
  const px = x + inset;
  const py = y + inset;
  const min = 0;
  const max = size;
  const cx = Math.max(min + radius, Math.min(max - radius, px));
  const cy = Math.max(min + radius, Math.min(max - radius, py));
  const dist = Math.hypot(px - cx, py - cy);
  return dist <= radius ? 1 : 0;
}

function inFolderBack(x, y) {
  return y >= 0.29 && y <= 0.54 && x >= 0.24 && x <= 0.79
    && !(y < 0.37 && x > 0.47 && x < 0.56);
}

function inFolderFront(x, y) {
  return x >= 0.2 && x <= 0.79 && y >= 0.39 && y <= 0.8;
}

function inPage(x, y) {
  return x >= 0.31 && x <= 0.69 && y >= 0.22 && y <= 0.72;
}

function inPageFold(x, y) {
  return x >= 0.57 && x <= 0.69 && y >= 0.22 && y <= 0.36 && x - 0.57 > y - 0.22;
}

function inPageLine(x, y) {
  const line1 = x >= 0.39 && x <= 0.59 && Math.abs(y - 0.45) < 0.018;
  const line2 = x >= 0.39 && x <= 0.55 && Math.abs(y - 0.54) < 0.018;
  return line1 || line2;
}

function inArrow(x, y) {
  const shaft = x >= 0.505 && x <= 0.565 && y >= 0.5 && y <= 0.84;
  const head = y >= 0.46 && y <= 0.66 && Math.abs(x - 0.535) <= (0.66 - y) * 0.7 + 0.025;
  return shaft || head;
}

function setPixel(buffer, idx, r, g, b, a) {
  buffer[idx] = r;
  buffer[idx + 1] = g;
  buffer[idx + 2] = b;
  buffer[idx + 3] = a;
}

function mix(start, end, t) {
  return start.map((value, index) => Math.round(value + (end[index] - value) * t));
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", writeIhdr(width, height)),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size === 256 ? 0 : image.size;
    entry[1] = image.size === 256 ? 0 : image.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

function buildSyso(icoBuffer) {
  const resources = buildIconResources(icoBuffer);
  const { sectionData, relocations } = buildResourceSection(resources);
  const coffHeader = Buffer.alloc(20);
  coffHeader.writeUInt16LE(0x8664, 0);
  coffHeader.writeUInt16LE(1, 2);
  coffHeader.writeUInt32LE(Math.floor(Date.now() / 1000), 4);
  coffHeader.writeUInt32LE(60 + sectionData.length + relocations.length * 10, 8);
  coffHeader.writeUInt32LE(1, 12);
  coffHeader.writeUInt16LE(0, 16);
  coffHeader.writeUInt16LE(0x0004, 18);

  const sectionHeader = Buffer.alloc(40);
  sectionHeader.write(".rsrc", 0, "ascii");
  sectionHeader.writeUInt32LE(sectionData.length, 8);
  sectionHeader.writeUInt32LE(sectionData.length, 16);
  sectionHeader.writeUInt32LE(60, 20);
  sectionHeader.writeUInt32LE(60 + sectionData.length, 24);
  sectionHeader.writeUInt16LE(relocations.length, 32);
  sectionHeader.writeUInt32LE(0xc0300040, 36);

  const relocationData = Buffer.concat(relocations.map((offset) => {
    const relocation = Buffer.alloc(10);
    relocation.writeUInt32LE(offset, 0);
    relocation.writeUInt32LE(0, 4);
    relocation.writeUInt16LE(0x0003, 8);
    return relocation;
  }));

  const symbol = Buffer.alloc(18);
  symbol.write(".rsrc", 0, "ascii");
  symbol.writeUInt16LE(1, 12);
  symbol[16] = 3;
  const stringTable = Buffer.alloc(4);
  stringTable.writeUInt32LE(4, 0);

  return Buffer.concat([coffHeader, sectionHeader, sectionData, relocationData, symbol, stringTable]);
}

function buildResourceSection(resources) {
  const chunks = [];
  const relocations = [];
  let offset = 0;

  function reserve(size) {
    const start = offset;
    chunks.push(Buffer.alloc(size));
    offset += size;
    return { start, buffer: chunks[chunks.length - 1] };
  }

  function writeDirectoryHeader(buffer, namedCount, idCount) {
    buffer.writeUInt16LE(namedCount, 12);
    buffer.writeUInt16LE(idCount, 14);
  }

  function writeEntry(buffer, index, id, targetOffset, isDirectory) {
    const entryOffset = 16 + index * 8;
    buffer.writeUInt32LE(id, entryOffset);
    buffer.writeUInt32LE(isDirectory ? (targetOffset | 0x80000000) >>> 0 : targetOffset, entryOffset + 4);
  }

  const groups = new Map();
  for (const resource of resources) {
    const items = groups.get(resource.type) ?? [];
    items.push(resource);
    groups.set(resource.type, items);
  }
  const types = Array.from(groups.keys()).sort((a, b) => a - b);
  const root = reserve(16 + types.length * 8);
  writeDirectoryHeader(root.buffer, 0, types.length);

  const typeDirs = new Map();
  const nameDirs = new Map();
  const dataEntryRefs = [];

  types.forEach((type, typeIndex) => {
    const items = groups.get(type).sort((a, b) => a.name - b.name);
    const typeDir = reserve(16 + items.length * 8);
    typeDirs.set(type, typeDir);
    writeDirectoryHeader(typeDir.buffer, 0, items.length);
    writeEntry(root.buffer, typeIndex, type, typeDir.start, true);

    items.forEach((item, itemIndex) => {
      const languageDir = reserve(24);
      nameDirs.set(`${type}:${item.name}`, languageDir);
      writeDirectoryHeader(languageDir.buffer, 0, 1);
      writeEntry(typeDir.buffer, itemIndex, item.name, languageDir.start, true);
      dataEntryRefs.push({ item, languageDir });
    });
  });

  const dataEntries = dataEntryRefs.map(({ item, languageDir }) => {
    const entry = reserve(16);
    writeEntry(languageDir.buffer, 0, 0x0409, entry.start, false);
    return { item, entry };
  });

  for (const { item, entry } of dataEntries) {
    const dataStart = offset;
    chunks.push(item.data);
    offset += item.data.length;
    const padding = alignBuffer(item.data.length);
    if (padding.length > 0) {
      chunks.push(padding);
      offset += padding.length;
    }
    entry.buffer.writeUInt32LE(dataStart, 0);
    entry.buffer.writeUInt32LE(item.data.length, 4);
    entry.buffer.writeUInt32LE(0, 8);
    entry.buffer.writeUInt32LE(0, 12);
    relocations.push(entry.start);
  }

  return {
    sectionData: Buffer.concat(chunks),
    relocations,
  };
}

function buildIconResources(icoBuffer) {
  const count = icoBuffer.readUInt16LE(4);
  const icons = [];
  const groupEntries = [];
  for (let i = 0; i < count; i += 1) {
    const entryOffset = 6 + i * 16;
    const bytesInRes = icoBuffer.readUInt32LE(entryOffset + 8);
    const imageOffset = icoBuffer.readUInt32LE(entryOffset + 12);
    const iconId = i + 1;
    icons.push({
      type: 3,
      name: iconId,
      data: icoBuffer.subarray(imageOffset, imageOffset + bytesInRes),
    });
    const groupEntry = Buffer.alloc(14);
    icoBuffer.copy(groupEntry, 0, entryOffset, entryOffset + 12);
    groupEntry.writeUInt16LE(iconId, 12);
    groupEntries.push(groupEntry);
  }
  const groupHeader = Buffer.alloc(6);
  groupHeader.writeUInt16LE(0, 0);
  groupHeader.writeUInt16LE(1, 2);
  groupHeader.writeUInt16LE(count, 4);
  return [
    ...icons,
    {
      type: 14,
      name: 1,
      data: Buffer.concat([groupHeader, ...groupEntries]),
    },
  ];
}

function alignBuffer(length) {
  const padding = (4 - (length % 4)) % 4;
  return Buffer.alloc(padding);
}
