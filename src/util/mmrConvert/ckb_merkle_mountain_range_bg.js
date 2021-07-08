import createInstance from './ckb_merkle_mountain_range_bg.wasm';

let wasm = {};

createInstance().then((m) => {
  wasm = m;
});

// const u32CvtShim = new Uint32Array(2);

// const bigUintArrayType =
//   typeof window.BigUint64Array === 'function'
//     ? window.BigUint64Array
//     : Float64Array

// // eslint-disable-next-line no-undef
// const uint64CvtShim = new bigUintArrayType(u32CvtShim.buffer);

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
  if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.instance.exports.memory.buffer) {
    cachegetUint8Memory0 = new Uint8Array(wasm.instance.exports.memory.buffer);
  }
  return cachegetUint8Memory0;
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1);
  getUint8Memory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
  if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.instance.exports.memory.buffer) {
    cachegetInt32Memory0 = new Int32Array(wasm.instance.exports.memory.buffer);
  }
  return cachegetInt32Memory0;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

const cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
/**
 * @param block_num
 * @param mmr_size
 * @param mmr_proof
 * @param leaf
 * @returns
 */
export function convert(block_num, mmr_size, mmr_proof, leaf) {
  /* eslint-disable-next-line no-magic-numbers */
  const retptr = wasm.instance.exports.__wbindgen_export_0.value - 16;
  /* eslint-disable-next-line no-magic-numbers */
  const r0 = getInt32Memory0()[retptr / 4 + 0];
  /* eslint-disable-next-line no-magic-numbers */
  const r1 = getInt32Memory0()[retptr / 4 + 1];

  try {
    const low0 = block_num;
    const high0 = 0;
    const low1 = mmr_size;
    const high1 = 0;
    const ptr2 = passArray8ToWasm0(mmr_proof, wasm.instance.exports.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(leaf, wasm.instance.exports.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;

    wasm.instance.exports.__wbindgen_export_0.value = retptr;
    wasm.instance.exports.convert(retptr, low0, high0, low1, high1, ptr2, len2, ptr3, len3);

    return getStringFromWasm0(r0, r1);
  } finally {
    /* eslint-disable-next-line no-magic-numbers */
    wasm.instance.exports.__wbindgen_export_0.value += 16;
    wasm.instance.exports.__wbindgen_free(r0, r1);
  }
}
