import { toast } from "react-toastify";
import { web3Accounts, web3Enable, web3FromAddress, web3ListRpcProviders, web3UseRpcProvider } from '@polkadot/extension-dapp';

import axios from 'axios';
import ConfigJson from './config';
import Web3 from 'web3';
import { checkAddress, decodeAddress, encodeAddress, setSS58Format } from '@polkadot/util-crypto';
import BN from 'bn.js';
import _ from 'lodash';
import genesisData from './genesis';
import TokenABI from './tokenABI';
import BankABI from './bankABI';
const { ApiPromise, WsProvider } = require('@darwinia/api');

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
    console.log('checkIssuingAllowance-amount', allowanceAmount.toString());
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

function connectEth(accountsChangedCallback, t) {
    if (typeof window.ethereum !== 'undefined' || typeof window.web3 !== 'undefined') {
        let web3js = new Web3(window.ethereum || window.web3.currentProvider);
        let subscribe = null;
        if (window.ethereum) {
            window.ethereum.enable()
                .then(async (account) => {
                    const networkid = await web3js.eth.net.getId()
                    if (config.ETHEREUM_NETWORK != networkid) {
                        formToast(t('common:Ethereum network type does not match'));
                        return;
                    }
                    if (window.ethereum.on) {
                        subscribe = window.ethereum.on('accountsChanged', (accounts) => {
                            if (accounts.length > 0) {
                                accountsChangedCallback && accountsChangedCallback('eth', accounts[0].toLowerCase());
                            }
                        })
                    }

                    if (account.length > 0) {
                        accountsChangedCallback && accountsChangedCallback('eth', account[0].toLowerCase(), subscribe);
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
            if (window.tronWeb.fullNode.host.indexOf(config.TRON_NETWORK_SYMBOL) == -1) {
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

async function connectSubstrate(accountsChangedCallback, t, networkType) {
    const allInjected = await web3Enable('wormhole.darwinia.network');
    const allAccounts = await web3Accounts();
    if (!allInjected || allInjected.length === 0) {
        formToast(t('common:Please install Polkadot Extension'));
        return;
    }

    if (!allAccounts || allAccounts.length === 0) {
        formToast(t('common:Polkadot Extension has no account'));
        return;
    }

    accountsChangedCallback && accountsChangedCallback(networkType, allAccounts);
}

function getRawData(text) {
    return config.SIGN_PREFIX + text
}

function combineFormatSignature(address, msg, sig) {
    return JSON.stringify({
        "address": address,
        "msg": msg,
        "sig": sig,
        "version": "3",
        "signer": "DarwiniaNetworkClaims"
    })
}

function signEth(account, text, signCallBack) {
    let web3js = new Web3(window.ethereum || window.web3.currentProvider);
    const rawData = getRawData(text);
    web3js.eth.personal.sign(rawData, account)
        .then((signature) => {
            signCallBack && signCallBack(combineFormatSignature(account, rawData, signature));
        });
}

function signTron(account, text, signCallBack) {
    const rawData = getRawData(text);
    if (typeof window.tronWeb !== 'undefined') {
        window.tronWeb.trx.sign(Web3.utils.stringToHex(rawData)).then((signature) => {
            signCallBack && signCallBack(combineFormatSignature(window.tronWeb.address.toHex(account), rawData, signature));
        })
    }
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

export function convertSS58Address(text, isShort = false) {
    let address = encodeAddress(text, config.S58_PREFIX)
    const length = 8
    if(isShort) {
        address = address.substr(0, length) + '...' +address.substr(address.length - length, length)
    }
    return address
}

export function isMiddleScreen() {
    return document.body.clientWidth < 1170;
}

async function buildInGenesisCrab(account, params, callback, t) {
    try {
        console.log('buildInGenesisCrab', { account, params, callback }, params.value.toString())
        if (window.crabApi) {
            await window.crabApi.isReady;
            const injector = await web3FromAddress(account);
            window.crabApi.setSigner(injector.signer);
            const hash = await window.crabApi.tx.crabIssuing.swapAndBurnToGenesis(params.value)
            .signAndSend(account);
            callback && callback(hash);
        }
    } catch (error) {
        console.log(error);
    }
}

export function connect(type, callback, t) {
    if (type === 'tron') {
        connectTron(callback, t)
    }

    if (type === 'eth') {
        connectEth(callback, t)
    }

    if (type === 'crab') {
        connectSubstrate(callback, t, 'crab')
    }
}

export function sign(type, account, text, callback, t) {
    const checkResult = checkAddress(text, config.S58_PREFIX);

    if (!checkResult[0]) {
        formToast(t(`crosschain:The entered {{account}} account is incorrect`, {
            replace: {
                account: config.NETWORK_NAME,
            }
        }))
        return
    }

    const decodedAddress = buf2hex(decodeAddress(text, false, config.S58_PREFIX).buffer)

    if (type === 'tron') {
        signTron(account, decodedAddress, callback)
    }

    if (type === 'eth') {
        signEth(account, decodedAddress, callback)
    }
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


export function getAirdropData(type, account) {
    if (!account) return Web3.utils.toBN(0);

    if (type === 'tron') {
        return Web3.utils.toBN(genesisData.tron[window.tronWeb.address.toHex(account)] || 0);
    }

    if (type === 'eth') {
        const dotAirdropNumber = Web3.utils.toBN(genesisData.dot[account] || 0);
        const ethAirdropNumber = Web3.utils.toBN(genesisData.eth[account] || 0);
        return dotAirdropNumber.add(ethAirdropNumber);
    }
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
            if (data && data.data) {
                console.log(`fetchData url: ${url}`, data.data);
            }
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
    let json = await wxRequest(params, `${config.EVOLUTION_LAND_DOMAIN}/api/bank/gringotts`)
    if (json.code === 0) {
        if (!json.data.list || json.data.list.length === 0) {
            cb && cb([])
            return;
        }
        const depositsOnChain = await getEthereumBankDepositByAddress(params.query.address);
        const r = _.filter(json.data.list, (item) => {
            console.log(item)
            return depositsOnChain.includes(item.deposit_id.toString());
        });

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

export async function getTokenBalanceCrab(account = '') {
    try {
        if (!window.crabApi) {
            const provider = new WsProvider('wss://crab.darwinia.network');

            // Create the API and wait until ready
            window.crabApi = new ApiPromise({ provider });
            await window.crabApi.isReady;
        }
        await window.crabApi.isReady;
        const usableBalance = await window.crabApi.rpc.balances.usableBalance(0, account);
        return [usableBalance.usableBalance.toString(), '0'];
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
    if (networkType === 'crab') {
        return getTokenBalanceCrab(account)
    }

    return ['0', '0']
}

export function textTransform(text, type) {
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
