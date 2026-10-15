/**
 * Strict JSON reader for imported curriculum content: rejects duplicate or prototype-like keys,
 * nesting deeper than 16, oversized input and anything `JSON.parse` would silently accept or coerce.
 * Objects are built with a null prototype so parsed data can never reach Object.prototype.
 */
export const MAX_BYTES = 1_000_000;
export const MAX_DEPTH = 16;
const DANGEROUS = new Set(['__proto__', 'constructor', 'prototype']);

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export class ContentError extends Error {}

export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

export function parseStrictJson(text: string): Json {
  if (typeof text !== 'string' || utf8Length(text) > MAX_BYTES) throw new ContentError('byte limit');
  let i = 0;
  const fail = (msg: string): never => {
    throw new ContentError(`${msg} at ${i}`);
  };
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i]!)) i++;
  };
  const str = (): string => {
    if (text[i] !== '"') fail('expected string');
    const start = i;
    i++;
    while (i < text.length && text[i] !== '"') {
      const c = text.charCodeAt(i);
      if (c < 0x20) fail('control character in string');
      i += text[i] === '\\' ? 2 : 1;
    }
    if (i >= text.length) fail('unterminated string');
    i++;
    return JSON.parse(text.slice(start, i)) as string;
  };
  const value = (depth: number): Json => {
    ws();
    const c = text[i];
    if (c === '{' || c === '[') {
      if (depth + 1 > MAX_DEPTH) fail('depth limit');
      i++;
      ws();
      if (c === '[') {
        const arr: Json[] = [];
        if (text[i] === ']') {
          i++;
          return arr;
        }
        for (;;) {
          arr.push(value(depth + 1));
          ws();
          if (text[i] === ',') i++;
          else if (text[i] === ']') {
            i++;
            return arr;
          } else fail('expected , or ]');
        }
      }
      const obj = Object.create(null) as { [k: string]: Json };
      if (text[i] === '}') {
        i++;
        return obj;
      }
      for (;;) {
        ws();
        const k = str();
        if (DANGEROUS.has(k) || Object.prototype.hasOwnProperty.call(obj, k)) fail('duplicate/dangerous key');
        ws();
        if (text[i] !== ':') fail('expected :');
        i++;
        obj[k] = value(depth + 1);
        ws();
        if (text[i] === ',') i++;
        else if (text[i] === '}') {
          i++;
          return obj;
        } else fail('expected , or }');
      }
    }
    if (c === '"') return str();
    const m = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i, i + 64));
    if (!m) return fail('invalid value');
    i += m[0].length;
    const v = JSON.parse(m[0]) as Json;
    if (typeof v === 'number' && !Number.isFinite(v)) fail('nonfinite number');
    return v;
  };
  const out = value(0);
  ws();
  if (i !== text.length) fail('trailing data');
  return out;
}
