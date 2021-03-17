import createInstance from './ckb_merkle_mountain_range_bg.wasm';

let wasm = {}
createInstance()
.then(m => {
    console.log(m)
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

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
/**
* @param {BigInt} block_num
* @param {BigInt} mmr_size
* @param {Uint8Array} mmr_proof
* @param {Uint8Array} leaf
* @returns {string}
*/
export function convert(block_num, mmr_size, mmr_proof, leaf) {
    try {
        const retptr = wasm.instance.exports.__wbindgen_export_0.value - 16;
        wasm.instance.exports.__wbindgen_export_0.value = retptr;

        // uint64CvtShim[0] = block_num;
        // const low0 = u32CvtShim[0];
        // const high0 = u32CvtShim[1];
        // uint64CvtShim[0] = mmr_size;
        // const low1 = u32CvtShim[0];
        // const high1 = u32CvtShim[1];

        // uint64CvtShim[0] = block_num;
        const low0 = block_num;
        const high0 = 0;
        // uint64CvtShim[0] = mmr_size;
        const low1 = mmr_size;
        const high1 = 0;

        var ptr2 = passArray8ToWasm0(mmr_proof, wasm.instance.exports.__wbindgen_malloc);
        var len2 = WASM_VECTOR_LEN;
        var ptr3 = passArray8ToWasm0(leaf, wasm.instance.exports.__wbindgen_malloc);
        var len3 = WASM_VECTOR_LEN;
        wasm.instance.exports.convert(retptr, low0, high0, low1, high1, ptr2, len2, ptr3, len3);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.instance.exports.__wbindgen_export_0.value += 16;
        wasm.instance.exports.__wbindgen_free(r0, r1);
    }
}

