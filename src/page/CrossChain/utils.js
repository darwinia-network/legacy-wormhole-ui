import { toast } from "react-toastify";
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';

import axios from 'axios';
import ConfigJson from './config';
import Web3 from 'web3';
import { checkAddress, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import BN from 'bn.js';
import _ from 'lodash';
import TokenABI from './tokenABI';
import BankABI from './bankABI';
// import DarwiniaToEthereumRelayABI from './abi/Relay'
import DarwiniaToEthereumTokenIssuingABI from './abi/TokenIssuing'
import RegistryABI from './registryABI';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundleForPolkadot } from '@darwinia/types/mix';
import {convert} from '../../util/mmrConvert/ckb_merkle_mountain_range_bg';
import { hexToU8a } from '@polkadot/util';

import { TypeRegistry } from '@polkadot/types';

function buf2hex(buffer) { // buffer is an ArrayBuffer
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

export const config = ConfigJson[process.env.REACT_APP_CHAIN];

/**
 * Ethereum Function, Approve Ring to Issuing
 * @param {*} callback
 */
export async function approveRingToIssuing(account, hashCallback, confirmCallback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(TokenABI, config['RING_ETH_ADDRESS']);

    contract.methods.approve(config.ETHEREUM_DARWINIA_ISSUING, '100000000000000000000000000').send({ from: account }).on('transactionHash', (hash) => {
        hashCallback && hashCallback(hash);
    }).on('confirmation', () => {
        confirmCallback && confirmCallback();
    }).catch((e) => {
        console.log(e)
    })
}

/**
 * Check if Issuing has sufficient transfer authority
 * @param {*} amount
 */
export async function checkIssuingAllowance(from, amount) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);

    const erc20Contract = new web3js.eth.Contract(TokenABI, config.RING_ETH_ADDRESS)
    const allowanceAmount = await erc20Contract.methods.allowance(from, config.ETHEREUM_DARWINIA_ISSUING).call()

    return !Web3.utils.toBN(allowanceAmount).lt(Web3.utils.toBN(amount || '10000000000000000000000000'))
}

/**
 * Get deposit by address
 * @param {*} amount
 */
export async function getEthereumBankDepositByAddress(from) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);

    const erc20Contract = new web3js.eth.Contract(BankABI, config.ETHEREUM_DARWINIA_BANK)
    const deposits = await erc20Contract.methods.getDepositIds(from).call()
    return deposits || []
}

/**
 * Get fee of crosschain transfer.
 * @param {*} amount
 */
export async function getEthereumToDarwiniaCrossChainFee() {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);

    const erc20Contract = new web3js.eth.Contract(RegistryABI, config.REGISTRY_ETH_ADDRESS)
    const fee = await erc20Contract.methods.uintOf('0x55494e545f4252494447455f4645450000000000000000000000000000000000').call()
    return fee || 0
}

/**
 * Get fee of crosschain transfer.
 * @param {*} amount
 */
export async function getDarwiniaToEthereumCrossChainFee() {
    try {

        const crosschainFee = window.darwiniaApi.consts.ethereumBacking.advancedFee.toString();
        return Web3.utils.toBN(crosschainFee);
    } catch (error) {
        console.log(error);
        return Web3.utils.toBN(50000000000);
    }
}

function connectEth(accountsChangedCallback, t) {
    if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
        let web3js = new Web3(window.ethereum || window.web3.currentProvider);

        if (window.ethereum) {
            window.ethereum.enable()
                .then(async (account) => {
                    const networkid = await web3js.eth.net.getId()
                    if (config.ETHEREUM_NETWORK !== networkid) {
                        formToast(t('common:Ethereum network type does not match'));
                        return;
                    }

                    if (account.length > 0) {
                        accountsChangedCallback && accountsChangedCallback('eth', account[0].toLowerCase());
                    }
                })
                .catch(console.error)
        } else if (window.web3) {
            web3js.eth.getAccounts().then(account => {
                if (Array.isArray(account) && account.length) {
                    accountsChangedCallback && accountsChangedCallback('eth', account[0].toLowerCase());
                }
            }).catch(console.error)
        }
    } else {
        formToast(t('common:Please install MetaMask first'));
    }
}

function connectTron(accountsChangedCallback, t) {
    if (typeof window.tronWeb !== 'undefined') {
        if (!(window.tronWeb && window.tronWeb.ready)) {
            formToast(t('common:Please unlock TronLink first'));
            return
        }
        if (window.tronWeb.fullNode && window.tronWeb.fullNode.host) {
            if (window.tronWeb.fullNode.host.indexOf(config.TRON_NETWORK_SYMBOL) === -1) {
                formToast(t('common:TRON network type does not match'));
                return
            }
        }
        const wallet = window.tronWeb.defaultAddress;
        const preAddress = wallet.base58;
        let subscribe = null;
        subscribe = window.tronWeb.on("addressChanged", wallet => {
            if (window.tronWeb) {
                console.log('addressChanged', preAddress, wallet.base58)
                if (preAddress !== wallet.base58) {
                    accountsChangedCallback && accountsChangedCallback('tron', wallet.base58)
                }
            }
        })
        accountsChangedCallback && accountsChangedCallback('tron', wallet.base58, subscribe)
    } else {
        formToast(t('common:Please install TronLink first'));
    }
}

export async function connectNodeProvider(wss, type = 'darwinia') {
    try{
        // !FIXME: If wss change, it will not connect to the new node with the provider.
        // Maybe the logic here is disconnect with the old node first then connect to new node.
        if (!window.darwiniaApi) {
            const provider = new WsProvider(wss);
            // Create the API and wait until ready
            window.darwiniaApi = await ApiPromise.create({ provider , typesBundle: {spec: {
                Crab: typesBundleForPolkadot.spec.crab,
                Pangolin: typesBundleForPolkadot.spec.pangolin,
                Darwinia: typesBundleForPolkadot.spec.darwinia,
              }}});

        }
    }catch (error) {
        console.log(error);
    }
}

async function connectSubstrate(accountsChangedCallback, t, networkType) {
    const allInjected = await web3Enable('wormhole.darwinia.network');
    const allAccounts = await web3Accounts();

    switch (networkType) {
        case 'crab':
            await connectNodeProvider('wss://crab-rpc.darwinia.network', 'crab');
            break;
        case 'darwinia':
            await connectNodeProvider(config.DARWINIA_ETHEREUM_FROM_WSS, 'darwinia');
            // await connectNodeProvider('ws://t1.hkg.itering.com:9944', 'darwinia');
            // await connectNodeProvider('wss://pangolin-rpc.darwinia.network', 'pangolin');
            // await connectNodeProvider('wss://crab.darwinia.network', 'crab');
            break;
        default:
            break;
    }

    if (!allInjected || allInjected.length === 0) {
        formToast(t('common:Please install Polkadot Extension'));
        accountsChangedCallback && accountsChangedCallback(networkType, []);
        return;
    }

    if (!allAccounts || allAccounts.length === 0) {
        formToast(t('common:Polkadot Extension has no account'));
        accountsChangedCallback && accountsChangedCallback(networkType, []);
        return;
    }

    accountsChangedCallback && accountsChangedCallback(networkType, allAccounts);
}

function buildInGenesisEth(account, params, callback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(TokenABI, config[`${params.tokenType.toUpperCase()}_ETH_ADDRESS`]);

    contract.methods.transferFrom(account, config['ETHEREUM_DARWINIA_CROSSCHAIN'], params.value, params.toHex).send({ from: account }).on('transactionHash', (hash) => {
        callback && callback(hash)
    }).on('confirmation', () => {

    }).catch((e) => {
        console.log(e)
    })
}

function redeemTokenEth(account, params, callback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(TokenABI, config[`${params.tokenType.toUpperCase()}_ETH_ADDRESS`]);

    contract.methods.transferFrom(account, config['ETHEREUM_DARWINIA_ISSUING'], params.value, params.toHex).send({ from: account }).on('transactionHash', (hash) => {
        callback && callback(hash)
    }).on('confirmation', () => {

    }).catch((e) => {
        console.log(e)
    })
}

function redeemDepositEth(account, params, callback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(BankABI, config[`ETHEREUM_DARWINIA_BANK`]);

    contract.methods.burnAndRedeem(params.depositID, params.toHex).send({ from: account }).on('transactionHash', (hash) => {
        callback && callback(hash)
    }).on('confirmation', () => {

    }).catch((e) => {
        console.log(e)
    })
}

async function buildInGenesisTron(account, params, callback) {
    const tronwebjs = window.tronWeb
    let contract = await tronwebjs.contract().at(config[`${params.tokenType.toUpperCase()}_TRON_ADDRESS`])
    const res = contract.methods.transferAndFallback(config['TRON_DARWINIA_CROSSCHAIN'], params.value.toString(), params.toHex).send({
        feeLimit: tronwebjs.toSun(100),
        callValue: 0,
        shouldPollResponse: false,
    })
    res.then((hash) => {
        callback && callback(hash);
    }).catch((e) => {
        console.log(e)
    })
}

export function toShortAccount(address, length = 8) {
    return  address.substr(0, length) + '...' +address.substr(address.length - length, length)
}

export function convertSS58Address(text, isShort = false) {
    if(!text) {
        return '';
    }
    try {
        let address = encodeAddress(text, config.S58_PREFIX)
        
        if(isShort) {
            address = toShortAccount(text);
        }
        return address
    } catch (error) {
        return ''
    }
}

export function isMiddleScreen() {
    return document.body.clientWidth < 1170;
}

async function buildInGenesisCrab(account, params, callback, t) {
    try {
        console.log('buildInGenesisCrab', { account, params, callback }, params.value.toString())
        if (window.darwiniaApi) {

            const injector = await web3FromAddress(account);
            window.darwiniaApi.setSigner(injector.signer);
            const hash = await window.darwiniaApi.tx.crabIssuing.swapAndBurnToGenesis(params.value)
            .signAndSend(account);
            callback && callback(hash);
        }
    } catch (error) {
        console.log(error);
    }
}

async function ethereumBackingLockDarwinia(account, params, callback, t) {
    try {
        console.log('ethereumBackingLock', { account, params, callback }, params.ring.toString(), params.kton.toString())
        if (window.darwiniaApi) {

            const injector = await web3FromAddress(account);
            window.darwiniaApi.setSigner(injector.signer);
            const hash = await window.darwiniaApi.tx.ethereumBacking.lock(params.ring, params.kton, params.to)
            .signAndSend(account);
            callback && callback(hash);
        }
    } catch (error) {
        console.log(error);
    }
}

export function connect(type, callback, t) {
    switch (type) {
        case 'tron':
            connectTron(callback, t)
            break;
        case 'eth':
            connectEth(callback, t)
            break;
        case 'crab':
            connectSubstrate(callback, t, 'crab')
            break;
        case 'darwinia':
            connectSubstrate(callback, t, 'darwinia')
            break;
        default:
            break;
    }
}

export function crossChainFromDarwiniaToEthereum(
    account, params, callback, t
) {
    ethereumBackingLockDarwinia(account, params, callback, t);
}

export function buildInGenesis(type, account, params, callback, t) {
    const checkResult = checkAddress(params.to, config.S58_PREFIX);
    console.log('buildInGenesis', checkResult, params.to, config.S58_PREFIX);
    if (!checkResult[0]) {
        formToast(t(`crosschain:The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    if (params.value.eq(new BN(0))) {
        formToast(t(`crosschain:The transfer amount cannot be 0`))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(params.to, false, config.S58_PREFIX).buffer)
    params.toHex = '0x' + decodedAddress

    if (type === 'tron') {
        buildInGenesisTron(account, params, callback)
    }

    if (type === 'eth') {
        buildInGenesisEth(account, params, callback)
    }

    if (type === 'crab') {
        buildInGenesisCrab(account, params, callback, t)
    }
}

export function redeemToken(type, account, params, callback, t) {
    const checkResult = checkAddress(params.to, config.S58_PREFIX);
    console.log('redeemToken', checkResult, params, config.S58_PREFIX);
    if (!checkResult[0]) {
        formToast(t(`crosschain:The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    if (params.value.eq(new BN(0))) {
        formToast(t(`crosschain:The transfer amount cannot be 0`))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(params.to, false, config.S58_PREFIX).buffer)
    params.toHex = '0x' + decodedAddress

    if (type === 'eth' && (params.tokenType === 'ring' || params.tokenType === 'kton')) {
        redeemTokenEth(account, params, callback)
    }

    if (type === 'eth' && (params.tokenType === 'deposit')) {
        redeemDepositEth(account, params, callback)
    }
}

export function redeemDeposit(type, account, params, callback, t) {
    const checkResult = checkAddress(params.to, config.S58_PREFIX);
    console.log('redeemToken', checkResult, params, config.S58_PREFIX);
    if (!checkResult[0]) {
        formToast(t(`crosschain:The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(params.to, false, config.S58_PREFIX).buffer)
    params.toHex = '0x' + decodedAddress

    if (type === 'eth' && (params.tokenType === 'deposit')) {
        redeemDepositEth(account, params, callback)
    }
}

export const formToast = (text) => {
    toast.info(text, {
        position: toast.POSITION.TOP_RIGHT,
        className: 'darwinia-toast'
    });
}

export function formatBalance(bn = Web3.utils.toBN(0), unit = 'gwei') {
    if (bn.eqn(0)) return '0';
    return Web3.utils.fromWei(bn, unit).toString();
}

export const wxRequest = async (params = {}, url) => {
    let data = params.query || {}
    return new Promise((resolve, reject) => {
        axios({
            url: url,
            method: params.method.toUpperCase() === 'FORM' ? 'POST' : params.method || 'GET',
            data: data,
            params: data,
            headers: {
                'Content-Type': params.method === 'FORM' ? 'application/x-www-form-urlencoded' : 'application/json;charset=UTF-8;',
            }
        }).then(function (data) {
            resolve(data.data)
        })
        .catch(function (error) {
            console.log(error);
        })
    })
}

export const getClaimsInfo = (params) => wxRequest(params, `${config.SUBSCAN_API}/api/other/claims`)

export const getEthereumToDarwiniaCrossChainInfo = async (params, cb, failedcb) => {
    let json = await wxRequest(params, `${config.DAPP_API}/api/redeem`);
    if (json.code === 0) {
        if (json.data.length === 0) {
            json = {
                data: []
            }
        }

        cb && cb(json.data)
    } else {
        failedcb && failedcb()
    }
}

export const getBuildInGenesisInfo = async (params, cb, failedcb) => {
    let json = await wxRequest(params, `${config.DAPP_API}/api/ringBurn`);
    if (json.code === 0) {
        if (json.data.length === 0) {
            json = {
                data: []
            }
        }

        cb && cb(json.data)
    } else {
        failedcb && failedcb()
    }
}

export const getDarwiniaToEthereumGenesisSwapInfo = async (params, cb, failedcb) => {
    let json = await wxRequest(params, `${config.DAPP_API}/api/ethereumBacking/locks`)

    if (json.code === 0) {
        if (!json.data.list || json.data.list.length === 0) {
            cb && cb([], {})
            return;
        }

        cb && cb(json.data.list, json.data)
    } else {
        failedcb && failedcb()
    }
}

export const getCringGenesisSwapInfo = async (params, cb, failedcb) => {
    let json = await wxRequest(params, `${config.SUBSCAN_API}/api/other/crabissuing`)
    if (json.code === 0) {
        if (!json.data.list || json.data.list.length === 0) {
            cb && cb([])
            return;
        }

        cb && cb(json.data.list.map((item) => {
            item.target = encodeAddress(params.query.address, config.S58_PREFIX);
            return item;
        }))
    } else {
        failedcb && failedcb()
    }
}

export const getEthereumBankDeposit = async (params, cb, failedcb) => {
    const json = await wxRequest(params, `https://www.evolution.land.l2me.com/api/bank/gringotts`)
    if (json.code === 0) {
        if (!json.data.list || json.data.list.length === 0) {
            cb && cb([])
            return;
        }
        const depositsOnChain = await getEthereumBankDepositByAddress(params.query.address);
        const r = _.filter(json.data.list, (item) => depositsOnChain.includes(item.deposit_id.toString()));

        cb && cb(r)
    } else {
        failedcb && failedcb()
    }
}

export function getTokenBalanceEth(account = '') {
    try {

        let web3js = new Web3(window.ethereum || window.web3.currentProvider);
        const ringContract = new web3js.eth.Contract(TokenABI, config.RING_ETH_ADDRESS);
        const ktonContract = new web3js.eth.Contract(TokenABI, config.KTON_ETH_ADDRESS);

        const ringBalance = new Promise((resolve, reject) => {
            try {
                ringContract.methods.balanceOf(account).call().then((result) => {
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        const ktonBalance = new Promise((resolve, reject) => {
            try {
                ktonContract.methods.balanceOf(account).call().then((result) => {
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        return Promise.all([ringBalance, ktonBalance]).then((values) => {
            return values
        })
    } catch (error) {
        console.log(error);
        return ['0', '0'];
    }
}

export async function getTokenBalanceTron(account = '') {
    try {
        const tronwebjs = window.tronWeb

        const ringContract = await tronwebjs.contract().at(config.RING_TRON_ADDRESS);
        const ktonContract = await tronwebjs.contract().at(config.KTON_TRON_ADDRESS);

        const ringBalance = new Promise((resolve, reject) => {
            try {
                ringContract.methods.balanceOf(account).call().then((result) => {
                    console.log('ring:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        const ktonBalance = new Promise((resolve, reject) => {
            try {
                ktonContract.methods.balanceOf(account).call().then((result) => {
                    console.log('kton:', result);
                    resolve(result);
                })
            } catch (error) {
                reject('0');
            }
        })

        return Promise.all([ringBalance, ktonBalance]).then((values) => {
            return values
        })
    } catch (error) {
        console.log(error);
        return ['0', '0'];
    }
}


export async function getTokenBalanceDarwinia(account = '') {
    try {

        // type = 0 query ring balance.  type = 1 query kton balance.
        const ringUsableBalance = await window.darwiniaApi.rpc.balances.usableBalance(0, account);
        const ktonUsableBalance = await window.darwiniaApi.rpc.balances.usableBalance(1, account);
        return [ringUsableBalance.usableBalance.toString(), ktonUsableBalance.usableBalance.toString()];
    } catch (error) {
        console.log(error);
        return ['0', '0']
    }
}

export function getTokenBalance(networkType, account) {
    if (networkType === 'eth') {
        return getTokenBalanceEth(account)
    }
    if (networkType === 'tron') {
        return getTokenBalanceTron(account)
    }
    if (networkType === 'crab' || networkType === 'darwinia') {
        return getTokenBalanceDarwinia(account)
    }

    return ['0', '0']
}

export function textTransform(text, type) {
    if(!text) return '';

    if (type === 'capitalize') {
        return text.charAt(0).toUpperCase() + text.slice(1)
    }

    if (type === 'uppercase') {
        return text.toUpperCase()
    }

    if (type === 'lowercase') {
        return text.toLowerCase()
    }
}

export function remove0x(text) {
    if (text.slice(0, 2) === '0x') {
        return text.slice(2)
    }
    return text;
}

export function substrateAddressToPublicKey(address) {
    return buf2hex(decodeAddress(address, false, config.S58_PREFIX).buffer);
}

export function encodeBlockHeader(blockHeaderStr) {
    const blockHeaderObj = JSON.parse(blockHeaderStr);
    const registry = new TypeRegistry();
    return registry.createType('Header',{
        "parentHash": blockHeaderObj.parent_hash,
        "number": blockHeaderObj.block_number,
        "stateRoot": blockHeaderObj.state_root,
        "extrinsicsRoot": blockHeaderObj.extrinsics_root,
        "digest": {
            logs: blockHeaderObj.digest
        }
    });
}

export async function getMPTProof(hash = '', proofAddress = '0xf8860dda3d08046cf2706b92bf7202eaae7a79191c90e76297e0895605b8b457') {
    if(window.darwiniaApi) {
        const proof = await window.darwiniaApi.rpc.state.getReadProof([proofAddress], hash);
        const registry = new TypeRegistry();

        return registry.createType('Vec<Bytes>',proof.proof.toJSON());
    }
}

function trimSpace(s){
    return s.replace(/(^\s*)|(\s*$)/g, "");
}

export async function getMMRProof(blockNumber, mmrBlockNumber, blockHash) {
    if(window.darwiniaApi) {
        const proof = await window.darwiniaApi.rpc.headerMMR.genProof(blockNumber, mmrBlockNumber);
        const proofStr = proof.proof.substring(1, proof.proof.length - 1);
        const proofHexStr = proofStr.split(',').map((item) => {
            return remove0x(trimSpace(item))
        });
        const encodeProof = proofHexStr.join('');
        const mmrProof = [
            // eslint-disable-next-line no-undef
            blockNumber, proof.mmrSize, hexToU8a('0x' + encodeProof), hexToU8a(blockHash)
        ]
        const mmrProofConverted = convert(...mmrProof);

        // parse wasm ouput
        const [mmrSize, peaksStr, siblingsStr] = mmrProofConverted.split('|');
        const peaks = peaksStr.split(',');
        const siblings = siblingsStr.split(',');

        return {
            mmrSize,
            peaks,
            siblings
        }
    }
}

function encodeMMRRootMessage(networkPrefix, methodID, mmrIndex, mmrRoot) {
    const registry = new TypeRegistry();
    return registry.createType('{"prefix": "Vec<u8>", "methodID": "[u8; 4; methodID]", "index": "Compact<u32>", "root": "H256"}', {
        prefix: networkPrefix,
        methodID: methodID,
        index: mmrIndex,
        root: mmrRoot
    })
}

export async function ClaimTokenFromD2E({ networkPrefix, mmrIndex, mmrRoot, mmrSignatures, blockNumber, blockHeaderStr, blockHash, historyMeta} , callback, fetchingEndCallback, t ) {
    try {
        connect('eth', async(_networkType, _account, subscribe) => {

            if(historyMeta.mmrRoot && historyMeta.best && historyMeta.best > blockNumber) {

                const blockHeader = encodeBlockHeader(blockHeaderStr);
                const mmrProof = await getMMRProof(blockNumber, historyMeta.best, blockHash);
                const eventsProof = await getMPTProof(blockHash);

                console.log('ClaimTokenFromD2E - darwiniaToEthereumVerifyProof', {
                    root: '0x' + historyMeta.mmrRoot,
                    MMRIndex: historyMeta.best,
                    blockNumber: blockNumber,
                    blockHeader: blockHeader.toHex(),
                    peaks: mmrProof.peaks,
                    siblings: mmrProof.siblings,
                    eventsProofStr: eventsProof.toHex()
                })

                darwiniaToEthereumVerifyProof(_account, {
                    root: '0x' + historyMeta.mmrRoot,
                    MMRIndex: historyMeta.best,
                    blockNumber: blockNumber,
                    blockHeader: blockHeader.toHex(),
                    peaks: mmrProof.peaks,
                    siblings: mmrProof.siblings,
                    eventsProofStr: eventsProof.toHex()
                }, (result) => {
                    console.log('darwiniaToEthereumVerifyProof', result)
                    callback && callback(result);
                });

                fetchingEndCallback && fetchingEndCallback();
            } else {

                const mmrRootMessage = encodeMMRRootMessage(networkPrefix, '0x479fbdf9', mmrIndex, mmrRoot);
                const blockHeader = encodeBlockHeader(blockHeaderStr);
                const mmrProof = await getMMRProof(blockNumber, mmrIndex, blockHash);
                const eventsProof = await getMPTProof(blockHash);

                console.log('ClaimTokenFromD2E - darwiniaToEthereumAppendRootAndVerifyProof', {
                    message: mmrRootMessage.toHex(),
                    signatures: mmrSignatures.split(','),
                    root: mmrRoot,
                    MMRIndex: mmrIndex,
                    blockNumber: blockNumber,
                    blockHeader: blockHeader.toHex(),
                    peaks: mmrProof.peaks,
                    siblings: mmrProof.siblings,
                    eventsProofStr: eventsProof.toHex()
                })

                darwiniaToEthereumAppendRootAndVerifyProof(_account, {
                    message: mmrRootMessage.toHex(),
                    signatures: mmrSignatures.split(','),
                    root: mmrRoot,
                    MMRIndex: mmrIndex,
                    blockNumber: blockNumber,
                    blockHeader: blockHeader.toHex(),
                    peaks: mmrProof.peaks,
                    siblings: mmrProof.siblings,
                    eventsProofStr: eventsProof.toHex()
                }, (result) => {
                    console.log('appendRootAndVerifyProof', result)
                    callback && callback(result);
                });
                fetchingEndCallback && fetchingEndCallback();
            }
        }, t)
    } catch (error) {
        fetchingEndCallback && fetchingEndCallback();
    }
}

export async function darwiniaToEthereumAppendRootAndVerifyProof(account, {
    message,
    signatures,
    root,
    MMRIndex,
    blockNumber,
    blockHeader,
    peaks,
    siblings,
    eventsProofStr
}, callback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(DarwiniaToEthereumTokenIssuingABI, config.DARWINIA_ETHEREUM_TOKEN_ISSUING);

    // bytes memory message,
    // bytes[] memory signatures,
    // bytes32 root,
    // uint32 MMRIndex,
    // uint32 blockNumber,
    // bytes memory blockHeader,
    // bytes32[] memory peaks,
    // bytes32[] memory siblings,
    // bytes memory eventsProofStr
    contract.methods.appendRootAndVerifyProof(
        message,
        signatures,
        root,
        MMRIndex,
        blockHeader,
        peaks,
        siblings,
        eventsProofStr).send({ from: account }, function(error, transactionHash) {
            if(error) {
               console.log(error);
               return;
            }
            callback && callback(transactionHash);
        })
}

export async function darwiniaToEthereumVerifyProof(account, {
    root,
    MMRIndex,
    blockNumber,
    blockHeader,
    peaks,
    siblings,
    eventsProofStr
}, callback) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const contract = new web3js.eth.Contract(DarwiniaToEthereumTokenIssuingABI, config.DARWINIA_ETHEREUM_TOKEN_ISSUING);

    // bytes32 root,
    // uint32 MMRIndex,
    // uint32 blockNumber,
    // bytes memory blockHeader,
    // bytes32[] memory peaks,
    // bytes32[] memory siblings,
    // bytes memory eventsProofStr
    contract.methods.verifyProof(
        root,
        MMRIndex,
        blockHeader,
        peaks,
        siblings,
        eventsProofStr).send({ from: account }, function(error, transactionHash) {
            if(error) {
               console.log(error);
               return;
            }
            callback && callback(transactionHash)
        })
}

export function isMetamaskInstalled() {
    return (
        typeof window.ethereum !== "undefined" ||
        typeof window.web3 !== "undefined"
    );
}

/**
 * 
 * @returns {Promise<string>} - current active account in metamask;
 */
export async function getMetamaskActiveAccount() {
    if (!isMetamaskInstalled) {
        return;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const accounts = await window.ethereum.request({
        method: "eth_accounts",
    });
    
    // metamask just return the active account now, so the result array contains only one account;
    return accounts[0];
}

/**
 * 
 * @param {number} expectNetworkId  - network id
 * @returns {Promise<boolean>} is acutal network id match with expected.
 */
export async function isNetworkMatch(expectNetworkId) {
    const web3 = new Web3(window.ethereum || window.web3.currentProvider);
    const networkId = await web3.eth.net.getId();

    return expectNetworkId === networkId;
}