"use strict";
/**
 * __mocks__/mime.js  —  Combined mime v1 + v2 polyfill for Jest
 *
 * WHY THIS EXISTS
 * ───────────────
 * supertest 7.x ships superagent 10.x which depends on mime v4 (pure ESM).
 * Jest runs in CJS mode and cannot import ESM, so mime v4 breaks in Jest.
 *
 * FURTHER COMPLICATION
 * ────────────────────
 * Express internals (the `send` package) depend on mime v1 API:
 *   mime.lookup(path), mime.charsets.lookup(type), mime.default_type
 *
 * superagent 10.x depends on mime v2/v4 API:
 *   mime.define(map), mime.getType(ext)
 *
 * Our moduleNameMapper points ALL require('mime') calls here, so this
 * file must implement BOTH the v1 AND v2 APIs correctly.
 */

// ─── Extension ↔ MIME type tables ────────────────────────────────────────────
const EXT_TO_TYPE = {
  txt: "text/plain",
  text: "text/plain",
  conf: "text/plain",
  log: "text/plain",
  html: "text/html",
  htm: "text/html",
  shtml: "text/html",
  css: "text/css",
  xml: "text/xml",
  csv: "text/csv",
  js: "application/javascript",
  mjs: "application/javascript",
  cjs: "application/javascript",
  json: "application/json",
  jsonld: "application/ld+json",
  map: "application/json",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  wasm: "application/wasm",
  bin: "application/octet-stream",
  exe: "application/octet-stream",
  form: "application/x-www-form-urlencoded",
  urlencoded: "application/x-www-form-urlencoded",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jfif: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  svgz: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  wav: "audio/wav",
  aac: "audio/aac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  md: "text/markdown",
  markdown: "text/markdown",
};

const TYPE_TO_EXT = {};
for (const [ext, type] of Object.entries(EXT_TO_TYPE)) {
  if (!TYPE_TO_EXT[type]) TYPE_TO_EXT[type] = ext;
}

// Charsets for text types — used by express/send
const CHARSET_MAP = {
  "text/html": "UTF-8",
  "text/plain": "UTF-8",
  "text/css": "UTF-8",
  "text/csv": "UTF-8",
  "text/xml": "UTF-8",
  "text/markdown": "UTF-8",
  "application/javascript": "UTF-8",
  "application/json": "UTF-8",
  "application/ld+json": "UTF-8",
  "application/xml": "UTF-8",
  "application/x-www-form-urlencoded": "UTF-8",
  "image/svg+xml": "UTF-8",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeExt(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/^\./, "").split(".").pop().toLowerCase();
}

// ─── mime v2 API  (superagent 10.x) ──────────────────────────────────────────

function getType(pathOrExt) {
  if (!pathOrExt || typeof pathOrExt !== "string") return null;
  if (pathOrExt.includes("/")) return pathOrExt; // already a MIME type
  const ext = normalizeExt(pathOrExt);
  return EXT_TO_TYPE[ext] || "application/octet-stream";
}

function getExtension(type) {
  if (!type || typeof type !== "string") return null;
  return TYPE_TO_EXT[type.split(";")[0].trim().toLowerCase()] || null;
}

function define(typeMap, force) {
  if (!typeMap || typeof typeMap !== "object") return;
  for (const [key, value] of Object.entries(typeMap)) {
    // v2 shape: { 'mime/type': ['ext1','ext2'] }
    if (Array.isArray(value)) {
      for (const ext of value) {
        const e = normalizeExt(ext) || ext;
        if (force || !EXT_TO_TYPE[e]) EXT_TO_TYPE[e] = key;
      }
      if (force || !TYPE_TO_EXT[key]) TYPE_TO_EXT[key] = value[0];
    }
    // v1 shape: { 'ext': 'mime/type' }
    else if (typeof value === "string" && value.includes("/")) {
      const e = normalizeExt(key) || key;
      if (force || !EXT_TO_TYPE[e]) EXT_TO_TYPE[e] = value;
      if (force || !TYPE_TO_EXT[value]) TYPE_TO_EXT[value] = e;
    }
  }
}

// ─── mime v1 API  (express / send package) ───────────────────────────────────

function lookup(pathOrExt) {
  if (!pathOrExt || typeof pathOrExt !== "string") return mime.default_type;
  if (pathOrExt.includes("/")) return pathOrExt;
  const ext = normalizeExt(pathOrExt);
  return EXT_TO_TYPE[ext] || mime.default_type;
}

function extension(type) {
  return getExtension(type);
}

function load() {
  /* no-op in test env */
}

const charsets = {
  lookup(type, fallback) {
    if (!type) return fallback || false;
    return (
      CHARSET_MAP[type.split(";")[0].trim().toLowerCase()] || fallback || false
    );
  },
};

// ─── Export — all four entry points ──────────────────────────────────────────
const mime = {
  // v2
  define,
  getType,
  getExtension,
  // v1
  lookup,
  extension,
  load,
  charsets,
  default_type: "application/octet-stream",
};

module.exports = mime;
module.exports.default = mime;
