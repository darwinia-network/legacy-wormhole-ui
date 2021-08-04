import React, { Component } from "react";
import { Button, Form, Spinner, Dropdown, ButtonGroup, Modal, Col, Alert } from 'react-bootstrap'
import { withRouter } from 'react-router-dom';

import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import _ from 'lodash';
import {
    connect, formToast, config, formatBalance, getBuildInGenesisInfo,
    getTokenBalance, buildInGenesis, textTransform, remove0x, convertSS58Address, isMiddleScreen,
    getCringGenesisSwapInfo, redeemToken, redeemDeposit, checkIssuingAllowance, approveRingToIssuing, getEthereumBankDeposit,
    getEthereumToDarwiniaCrossChainInfo, getEthereumToDarwiniaCrossChainFee, crossChainFromDarwiniaToEthereum, getDarwiniaToEthereumCrossChainFee,
    getDarwiniaToEthereumGenesisSwapInfo, substrateAddressToPublicKey, ClaimTokenFromD2E, getMetamaskActiveAccount,
    getErc20BurnsRecords, getErc20TokenLockRecords, getMMRProof, getMPTProof, isNetworkConsistent
} from './utils'
import { canCrossSendToDvm, crossSendErc20FromEthToDvm, crossSendErc20FromDvmToEth, canCrossSendToEth, claimErc20Token } from './erc20/token';
import { InputRightWrap } from '../../components/InputRightWrap'
import InputWrapWithCheck from '../../components/InputWrapWithCheck'
import FormTip from '../../components/FormTip'

import { parseChain } from '../../util';
import { withTranslation } from "react-i18next";
import i18n from '../../locales/i18n';

import styles from "./style.module.scss";
import step1open from './img/step-1-open.png';
import step2open from './img/step-2-open.png';
import step2close from './img/step-2-close.png';
import step3open from './img/step-3-open.png';
import step3close from './img/step-3-close.png';
import helpLogo from './img/help-icon.png';
import labelTitleLogo from './img/label-title-logo.png';

import stepStartIcon from './img/tx-step-start-icon.svg';

import roadmapStatus0 from './img/roadmap-status-0.svg';
import roadmapStatusActive0 from './img/roadmap-status-0-active.svg';
import roadmapStatus1 from './img/roadmap-status-1.svg';
import roadmapStatus2 from './img/roadmap-status-2.svg';

import chainMap from '../Wrapper/chain';
import Erc20Token from '../../components/erc20/erc20TokenComponent'
import AssetControl from "../../components/controls/assetControl";
import { txProgressIcon } from './icons';
import HistoryRecord from "../../components/historyRecord/historyRecord";
import { getSymbolAndDecimals } from './erc20/token-util';
import { decodeUint256, hasApproved } from './erc20/token';

class CrossChain extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            //  1 - init, 2 - form, 3 - submited
            status: 1,
            networkType: 'eth',
            tokenType: 'ring',
            account: {
                eth: '',
                tron: '',
                darwinia: '',
                isReady: false
            },
            signature: '',
            darwiniaAddress: '',
            recipientAddress: '',
            airdropNumber: Web3.utils.toBN(0),
            claimAmount: Web3.utils.toBN(0),
            claimTarget: '',
            hasFetched: false,
            checkedBall: '',
            relatedBall: [],
            from: '',
            to: '',
            ringBalance: Web3.utils.toBN(0),
            ktonBalance: Web3.utils.toBN(0),
            crossChainBalanceText: '',
            crossChainBalance: Web3.utils.toBN(0),
            crossChainKtonBalanceText: '',
            crossChainKtonBalance: Web3.utils.toBN(0),
            hash: '',
            txhash: '',
            history: null,
            historyMeta: {},
            isAllowanceIssuing: false,
            isApproving: false,
            currentDepositID: null,
            crossChainFee: Web3.utils.toBN(0),
            d2eModalData: {
                isShow: false,
                hash: ''
            },
            crabAndDarwiniaHistory: {
                isManual: false,
                address: '',
                isFetchingClaimParams: false
            },
            accountValidation: null,
            isRegisterTokenModalDisplay: false,
            erc20Token: {},
            erc20TokenTransferState: null,
        }
        this.querySubscribe = null
    }

    componentDidMount() {
        this.routerHandle()
    }

    routerHandle = (location) => {
        const { hash } = location || this.props.location;
        const { onChangePath } = this.props;
        if (hash === '#tron') {
            this.setState({
                networkType: 'tron',
                from: 'tron',
                to: 'darwinia'
            })
            onChangePath({
                from: 'tron',
                to: 'darwinia'
            })
        }

        if (hash === '#ethereum') {
            this.setState({
                networkType: 'eth',
                from: 'eth',
                to: 'darwinia'
            })
            onChangePath({
                from: 'ethereum',
                to: 'darwinia'
            })
        }

        if (hash === '#crab') {
            this.setState({
                networkType: 'crab',
                from: 'crab',
                to: 'darwinia'
             })
            onChangePath({
                from: 'crab',
                to: 'darwinia'
            })
        }

        if (hash === '#darwinia') {
            this.setState({
                networkType: 'darwinia',
                from: 'darwinia',
                to: 'eth'
            })
            onChangePath({
                from: 'darwinia',
                to: 'ethereum'
            })
        }
    }

    setValue = (key, event, fn, cb) => {
        this.setState({
            [key]: fn ? fn(event.target.value) : event.target.value
        })
        cb && cb(event.target.value)
        event.persist && event.persist()
    }

    setRingBalanceText = (value) => {
        this.setState({
            crossChainBalanceText: value
        })
    }

    setKtonBalanceText = (value) => {
        this.setState({
            crossChainKtonBalanceText: value
        })
    }

    setCurrentAccount = (networkType, event, cb = function () { }) => {
        const { account } = this.state
        this.setState({
            account: {
                ...account,
                [networkType]: event.target.value
            }
        }, cb.bind(this, event.target.value))
    }

    setModalShow = (status) => {
        this.setState({
            d2eModalData: {
                ...this.state.d2eModalData,
                isShow: status
            }
        })
    }

    setModalHash = (hash) => {
        this.setState({
            d2eModalData: {
                ...this.state.d2eModalData,
                hash
            }
        })
    }

    toWeiBNMiddleware = (num = '0', unit = 'ether') => {
        try {
            // if (num) {
                return Web3.utils.toBN(Web3.utils.toWei(num || '0', unit))
            // }
        } catch (error) {
            console.log(error)
            // return Web3.utils.toWei(Web3.utils.toBN('0'))
        }
    }

    initForm = () => {
        this.setState({
            darwiniaAddress: '',
            crossChainBalanceText: '',
        })
    }

    useQuery = () => {
        return new URLSearchParams(this.props.location.search);
    }

    toClaims = (status = 2) => {
        const { networkType, account } = this.state;
        const { t } = this.props;
        this.initForm()

        switch (networkType) {
            case 'eth':
                connect(networkType, (_networkType, _account) => {
                    let initAccount = ''

                    if (Array.isArray(_account) && _account.length > 0) {
                        initAccount = _account[0].address
                    } else if (Array.isArray(_account) && _account.length === 0) {
                        initAccount = ''
                    } else {
                        initAccount = _account
                    }

                    this.setState({
                        history: null,
                        account: {
                            ...account,
                            [_networkType]: initAccount,
                            [`${_networkType}List`]: _account,
                            isReady: false,
                            crossChainFee: Web3.utils.toBN(0),
                        }
                    }, async () => {
                        if (this.state.account[_networkType]) {
                            this.setState({
                                status: status
                            })
                            if (status === 4) {
                                this.queryClaims()
                                return;
                            }

                            const balances = await getTokenBalance(networkType, this.state.account[networkType]);
                            const isAllowance = await checkIssuingAllowance(this.state.account[networkType]);
                            const crossChainFee = await getEthereumToDarwiniaCrossChainFee();
                            const getEthereumDeposits = (address) => {
                                return new Promise((resolve, reject) => {
                                    getEthereumBankDeposit({
                                        query: { address: address },
                                        method: "get"
                                    }, (data) => {
                                        resolve(data);
                                    }, () => {
                                        resolve([])
                                    })
                                })
                            }

                            const ethereumDeposits = await getEthereumDeposits(this.state.account[networkType]) || [];

                            this.setState({
                                ringBalance: Web3.utils.toBN(balances[0]),
                                ktonBalance: Web3.utils.toBN(balances[1]),
                                isAllowanceIssuing: isAllowance,
                                ethereumDeposits: ethereumDeposits,
                                currentDepositID: ethereumDeposits.length > 0 ? ethereumDeposits[0].deposit_id : null,
                                crossChainFee: Web3.utils.toBN(crossChainFee),
                                account: {
                                    ...this.state.account,
                                    isReady: true
                                }
                            })
                        } else {
                            if (status === 4) {
                                this.queryClaims()
                                return;
                            }
                        }
                    })
                }, t);
                break;
            case 'tron':
            case 'crab':
                connect(networkType, (_networkType, _account, subscribe) => {
                    let initAccount = ''

                    // this.querySubscribe && this.querySubscribe();
                    // this.querySubscribe = subscribe;
                    if (Array.isArray(_account) && _account.length > 0) {
                        initAccount = _account[0].address
                    } else {
                        initAccount = _account
                    }

                    this.setState({
                        history: null,
                        account: {
                            ...account,
                            [_networkType]: initAccount,
                            [`${_networkType}List`]: _account,
                            isReady: false,
                            crossChainFee: Web3.utils.toBN(0),
                        }
                    }, async () => {
                        if (this.state.account[_networkType]) {
                            this.setState({
                                status: status
                            })
                            if (status === 4) {
                                this.queryClaims()
                                return;
                            }
                        }
                    })
                }, t);
                break;
            case 'darwinia':
                isNetworkConsistent(status === 2 ? config.DVM_NETWORK_ID : config.ETHEREUM_NETWORK).then((isExpected) => { 
                    if(isExpected) {
                        this.setState({
                            history: null,
                            account: {
                                ...account,
                                isReady: false,
                            },
                            status
                        }, () => {
                            connect(networkType, (_networkType, _account, subscribe) => {
                                let initAccount = ''

                                // this.querySubscribe && this.querySubscribe();
                                // this.querySubscribe = subscribe;
                                const searchQuery = this.useQuery();
                                const addressParams = searchQuery.get('address')

                                if (addressParams && _.find(_account, {address: addressParams})) {
                                    initAccount = addressParams;
                                } else if (this.state.account[_networkType] && _.find(_account, {address: this.state.account[_networkType]})) {
                                    initAccount = this.state.account[_networkType]
                                } else if (Array.isArray(_account) && _account.length > 0) {
                                    initAccount = _account[0].address
                                } else if (Array.isArray(_account) && _account.length === 0) {
                                    initAccount = ''
                                } else {
                                    initAccount = _account
                                }

                                this.setState({
                                    history: null,
                                    account: {
                                        ...account,
                                        [_networkType]: initAccount,
                                        [`${_networkType}List`]: _account,
                                        isReady: false,
                                    },
                                    crabAndDarwiniaHistory: {
                                        ...this.state.crabAndDarwiniaHistory,
                                        isManual: !initAccount,
                                        address: ''
                                    }
                                }, async () => {
                                    if (this.state.account[_networkType]) {
                                        if (status === 4) {
                                            this.queryClaims()
                                            return;
                                        }

                                        const balances = await getTokenBalance(networkType, this.state.account[networkType]);
                                        const crossChainFee = await getDarwiniaToEthereumCrossChainFee();
                                        this.setState({
                                            ringBalance: Web3.utils.toBN(balances[0]),
                                            ktonBalance: Web3.utils.toBN(balances[1]),
                                            crossChainFee: Web3.utils.toBN(crossChainFee),
                                            account: {
                                                ...this.state.account,
                                                isReady: true
                                            }
                                        })
                                    } else {
                                        if (status === 4) {
                                            this.queryClaims()
                                            return;
                                        }
                                    }
                                })
                            }, t);
                        })
                    } else {
                        formToast(t('Ethereum network type does not match, please switch to {{network}} network in metamask.', { network: status === 2 ? config.NETWORK_NAME : config.ETHERSCAN_DOMAIN.name }));
                    }
                });
                break;
            default:
                break;
        }

    }

    buildInGenesis = () => {
        const { networkType, account, darwiniaAddress, crossChainBalance, tokenType } = this.state;
        const { t } = this.props;

        if (!this.checkForm(networkType === 'crab' ? 'gwei' : 'ether')) return;
        buildInGenesis(networkType, account[networkType], {
            to: darwiniaAddress,
            value: crossChainBalance,
            tokenType
        }, (hash) => {
            this.setState({
                txhash: hash,
                status: 3
            })
        }, t)
    }

    crossChainFromDarwiniaToEthereum = () => {
        const { networkType, account, recipientAddress, crossChainBalance, crossChainKtonBalance, tokenType, erc20Token } = this.state;
        const { t } = this.props;

        if (!this.checkFormDarwiniaToEthereum('gwei')) {
            return;
        }

        if(tokenType === 'erc20') {
            getMetamaskActiveAccount().then(currentAccount => {
               return canCrossSendToEth(erc20Token, currentAccount).then(result => { 
                    if(typeof result === 'string'){
                        this.setState({erc20TokenTransferState: { approveTxHash: result }})
                    } else {
                        this.setState({erc20TokenTransferState: { }});
                    }

                    return crossSendErc20FromDvmToEth(
                        erc20Token.address,
                        recipientAddress, 
                        crossChainBalance,
                        currentAccount
                    );
               }).then((transferTxHash) => { 
                    const { erc20TokenTransferState } = this.state;

                    this.setState({
                        erc20TokenTransferState: {
                            ...erc20TokenTransferState,
                            transferTxHash,
                        },
                        isApproving: false,
                        crossChainBalance: Web3.utils.toBN(0),
                        crossChainBalanceText: '',
                    });
               }).catch(err => {
                    formToast(t(err.message, { network: config.IS_DEV ? "Pangolin" : "Darwinia"}));
                    this.setState({ erc20TokenTransferState: null });
                });
            });
        } else {
            crossChainFromDarwiniaToEthereum(account[networkType], {
                to: recipientAddress,
                ring: crossChainBalance,
                kton: crossChainKtonBalance
            }, (hash) => {
                this.setState({
                    txhash: hash,
                    status: 3
                })
            }, t)
        }
    }

    redeemToken = () => {
        const { networkType, account, darwiniaAddress, crossChainBalance, tokenType, currentDepositID } = this.state;
        const { t } = this.props;

        if (!this.checkForm(networkType === 'crab' ? 'gwei' : 'ether', tokenType)) return;

        if (tokenType === 'ring' || tokenType === 'kton') {
            redeemToken(networkType, account[networkType], {
                to: darwiniaAddress,
                value: crossChainBalance,
                tokenType
            }, (hash) => {
                this.setState({
                    txhash: hash,
                    status: 3
                })
            }, t)
        } else {
            redeemDeposit(networkType, account[networkType], {
                to: darwiniaAddress,
                tokenType,
                depositID: currentDepositID
            }, (hash) => {
                this.setState({
                    txhash: hash,
                    status: 3
                })
            }, t)
        }
    }

    approveRingToIssuing = () => {
        const { networkType, account, tokenType, erc20Token, darwiniaAddress, crossChainBalance } = this.state;

        if(tokenType === 'erc20') {
            this.setState({ isApproving: true, erc20TokenTransferState: null });

            canCrossSendToDvm(erc20Token, account.eth).then(result => { 
                if(typeof result === 'string'){
                    this.setState({erc20TokenTransferState: { approveTxHash: result }})
                } else {
                    this.setState({erc20TokenTransferState: { }});
                }

                return crossSendErc20FromEthToDvm(
                    erc20Token.address,
                    darwiniaAddress,
                    crossChainBalance,
                    account.eth
                );
            }).then((transferTxHash) => { 
                const { erc20TokenTransferState } = this.state;

                this.setState({ 
                    erc20TokenTransferState: {
                        ...erc20TokenTransferState,
                        transferTxHash 
                    },
                    isApproving: false,
                    crossChainBalanceText: '',
                    crossChainBalance: Web3.utils.toBN(0) 
                });
            }).catch(error => { 
                console.warn(
                    "%c [ error ]-499",
                    "font-size:13px; background:pink; color:#bf2c9f;",
                    error.message
                );
                this.setState({ isApproving: false, erc20TokenTransferState: null });               
            });
        } else {
            approveRingToIssuing(account[networkType], () => {
                this.setState({
                    isApproving: true
                })
            }, async () => {
                if (!this.state.isAllowanceIssuing) {
                    const isAllowance = await checkIssuingAllowance(account[networkType]);
                    this.setState({
                        isApproving: false,
                        isAllowanceIssuing: isAllowance
                    })
                }
            })
        }
    }

    checkForm = (unit = 'ether') => {
        const { crossChainBalance, crossChainBalanceText, ringBalance, ktonBalance, tokenType, currentDepositID, crossChainFee } = this.state;
        const balance = {
            ringBalance,
            ktonBalance
        }
        const { t } = this.props;

        if (tokenType === 'deposit') {
            if (_.isNull(currentDepositID)) {
                formToast(t(`crosschain:No Deposits`))
                return false
            } else {
                return true;
            }
        }

        try {
            Web3.utils.toBN(Web3.utils.toWei(crossChainBalanceText, unit))
        } catch (error) {
            console.log('check form error:', error)
            formToast(t(`Amount is wrong`))
            return false
        }

        if (crossChainBalance.gt(balance[`${tokenType}Balance`])) {
            formToast(t(`crosschain:The amount exceeds the account available balance`))
            return false
        }

        if (tokenType === 'ring' && crossChainBalance.gt(balance[`${tokenType}Balance`].sub(crossChainFee))) {
            formToast(t(`crosschain:The amount exceeds the account available balance`))
            return false
        }

        return true
    }

    checkFormDarwiniaToEthereum = (unit = 'ether') => {
        const { crossChainBalance, crossChainKtonBalance, crossChainBalanceText, recipientAddress,
            crossChainKtonBalanceText, ringBalance, ktonBalance, crossChainFee, tokenType, erc20Token } = this.state;

        const { t } = this.props;


        if(!Web3.utils.isAddress(recipientAddress)) {
            formToast(t(`crosschain:The entered recipient account is incorrect`))
            return false
        }

        try {
            Web3.utils.toBN(Web3.utils.toWei(crossChainBalanceText || '0', unit))
            Web3.utils.toBN(Web3.utils.toWei(crossChainKtonBalanceText || '0', unit))

            if( Web3.utils.toBN(Web3.utils.toWei(crossChainBalanceText || '0')).add( Web3.utils.toBN(Web3.utils.toWei(crossChainKtonBalanceText || '0')) ).lten(0) ) {
                throw new Error('Amount is wrong');
            }
        } catch (error) {
            console.log('check form error:', error)
            formToast(t(`crosschain:Amount is wrong`))
            return false
        }

        if(tokenType !== 'erc20') {
            if ((crossChainBalance.add(crossChainFee).add(Web3.utils.toBN(2000000000))).gt(ringBalance)) {
                formToast(t(`crosschain:The amount exceeds the account available balance`))
                return false
            }
        } else {
            if(crossChainBalance.gt(erc20Token.balance)) {
                formToast(t(`crosschain:The amount exceeds the account available balance`))
                return false;
            }
        }

        if (crossChainKtonBalance.gt(ktonBalance)) {
            formToast(t(`crosschain:The amount exceeds the account available balance`))
            return false
        }

        return true
    }

    onCopied = () => {
        const { t } = this.props
        formToast(t('crosschain:Copied'))
    }

    toResult = () => {
        this.toClaims(4)
    }

    async queryClaims() {
        const { networkType, account } = this.state;
        let address = ''
        this.setState({
            history: null
        })

        switch (networkType) {
            case "eth":
                address = account[networkType]
                const ethereumGenesisInfo = new Promise((resolve, reject) => {
                    getBuildInGenesisInfo({
                        query: { address: address },
                        method: "get"
                    }, (data) => {
                        resolve(data);
                    }, () => {
                        resolve([]);
                    });
                })

                const ethereumToDarwiniaCrossChainInfo = new Promise((resolve, reject) => {
                    getEthereumToDarwiniaCrossChainInfo({
                        query: { address: address },
                        method: "get"
                    }, (data) => {
                        resolve(data);
                    }, () => {
                        resolve([]);
                    });
                })

                const promises = [ethereumGenesisInfo, ethereumToDarwiniaCrossChainInfo];

                if (config.IS_DEV) {
                    promises.push(getErc20TokenLockRecords({ sender: address, row: 200, page: 0 }))
                }
                Promise.all(promises)
                    .then(([genesisHistory, crosschainHistory, erc20CrossChain]) => this.getSymbolMap(erc20CrossChain.list).then(symbolMap => [genesisHistory, crosschainHistory, erc20CrossChain, symbolMap]))
                    .then(([genesisHistory, crosschainHistory, erc20CrossChain, symbolMap]) => {
                        this.setState({
                            history: [...(crosschainHistory.concat(erc20CrossChain.list.map(item => ({...item, isErc20: true, symbol: symbolMap[item.source]})))).map((item) => ({ ...item, isCrossChain: true })), ...genesisHistory]
                        })
                    }).catch((error) => {
                        console.log('get history error', error);
                    })
                break;
            case "tron":
                address = (window.tronWeb && window.tronWeb.address.toHex(account[networkType]))
                await getBuildInGenesisInfo({
                    query: { address: address },
                    method: "get"
                }, (data) => {
                    this.setState({
                        history: data
                    })
                }, () => {
                    this.setState({
                        history: []
                    })
                });
                break;
            case "crab":
                address = account[networkType]
                await getCringGenesisSwapInfo({
                    query: { address: address },
                    method: "post"
                }, (data) => {
                    this.setState({
                        history: data
                    })
                }, () => {
                    this.setState({
                        history: []
                    })
                });
                break;
            case "darwinia":
                address = account[networkType]
                try {
                    await getDarwiniaToEthereumGenesisSwapInfo({
                        query: {
                            address: '0x' + substrateAddressToPublicKey(address),
                            row: 200,
                            page: 0
                        },
                        method: "get"
                    }, (list, data) => {
                        this.setState({
                            history: list,
                            historyMeta: {
                                best: data.best,
                                mmrRoot: data.MMRRoot
                            }
                        })
                    }, () => {
                        this.setState({
                            history: [],
                            historyMeta: {}
                        })
                    });
                } catch (error) {
                    this.setState({
                        history: [],
                        historyMeta: {}
                    })
                }

                try {
                    const { list, best, MMRRoot } = await getErc20BurnsRecords({ page: 0, row: 200 });
                    const symbolMap = await this.getSymbolMap(list);

                    this.setState({
                        erc20History: list.map(({ source, ...others }) => {

                            return { ...others, source, symbol: symbolMap[source] }
                        }),
                        erc20HistoryMeta: { best, mmrRoot: MMRRoot } 
                    });
                } catch (error) {
                    this.setState({
                        erc20History: [],
                        erc20HistoryMeta: {},
                    });
                }

                break;
            default:
                break;
        }
    }

    getSymbolMap = async (list) => { 
        const sources = _.uniq(list.map(item => item.source));
        const data = await Promise.all(sources.map(async source => { 
            const { symbol } = await getSymbolAndDecimals(source)

            return { [source] : symbol };
        }));

        return data.reduce((acc, cur) => ({ ...acc, ...cur }), { });
    }

    goBack = (status = 1) => {
        if (status === 1) {
            const {hash} = this.props.location;
            this.props.history.replace({hash: hash})

            this.setState({
                hasFetched: false
            })
        }
        this.setState({
            status: status
        })
    }

    renderHeader = () => {
        const { status } = this.state;
        const { t } = this.props
        return (
            <>
                {status === 1 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2close} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 2 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 3 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('crosschain:step_2')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('crosschain:step_3')}</p>
                    </div>
                </div> : null}
                {status === 4 ? <div className={`${styles.stepBox} ${styles.stepResultBox}`}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('crosschain:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('crosschain:Result')}</p>
                    </div>
                </div> : null}
            </>
        )
    }

    renderDepositItem = (deposit) => {
        const { t } = this.props;
        if (!deposit) return <p>{t('crosschain:No Deposits')}</p>;
        if (Array.isArray(deposit) && deposit.length === 0) return <p>{t('crosschain:No Deposits')}</p>
        if (Array.isArray(deposit) && deposit.length > 0) {
            deposit = deposit[0]
        }

        const depositStartTime = dayjs.unix(deposit.deposit_time);
        const depositEndTime = depositStartTime.add(30 * deposit.duration, 'day');

        return <p>{deposit.amount} RING <span className={styles.depositItem}>({t('crosschain:Deposit ID')}: {deposit.deposit_id} {t('Time')}: {depositStartTime.format('YYYY/MM/DD')} - {depositEndTime.format('YYYY/MM/DD')})</span></p>;
    }

    renderDepositHistoryDetail = (amount, deposit) => {
        const { t } = this.props;
        if (!deposit) return null;

        const depositStartTime = dayjs.unix(deposit.start);
        const depositEndTime = depositStartTime.add(30 * deposit.month, 'day');

        return <p>{formatBalance(Web3.utils.toBN(amount), 'ether')} RING ({t('crosschain:Time')}: {depositStartTime.format('YYYY/MM/DD')} - {depositEndTime.format('YYYY/MM/DD')})</p>;
    }

    getDepositByID = (id) => {
        const { ethereumDeposits } = this.state;
        if (!ethereumDeposits) {
            return null
        }

        const r = ethereumDeposits.filter((deposit) => {
            return deposit.deposit_id === parseInt(id);
        })

        return r
    }

    renderNetworkBox = ({ networkType, account, status, tokenType, t, darwiniaAddress, crossChainBalance, currentDepositID }) => {

        /* current connected - ethereum, tron network */
        return (
            <>
                {networkType === 'eth' || networkType === 'tron' ?
                    <div className={styles.formBox}>
                        <div className={`${styles.connectInfoBox} claims-network-box`}>
                            <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                            <p>{account[networkType]}</p>

                            {status === 3 ? <>
                                <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Darwinia Network account')}：</span></h1>
                                <p>{darwiniaAddress}</p>
                                <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Detail')}：</span></h1>
                                {tokenType === 'ring' || tokenType === 'kton' ? <p>{`${formatBalance(crossChainBalance, 'ether')} ${tokenType.toUpperCase()}`}</p> : null}
                                {tokenType === 'deposit' ? this.renderDepositItem(this.getDepositByID(currentDepositID)) : null}

                            </> : null}
                        </div>
                    </div> : null}
            </>
        );
    }

    renderForm = ({
        networkType, account, t, tokenType , crossChainBalanceText, crossChainKtonBalanceText, currentDepositID, ethereumDeposits, crossChainFee,
        darwiniaAddress, ringBalance, ktonBalance, isApproving, isAllowanceIssuing, middleScreen, recipientAddress
    }) => {
        const onAssetChange = (event) =>  {
            const key = 'tokenType';

            this.setValue(key, event, null, () => {
                this.setState({
                    crossChainBalanceText: "",
                });
            });
        };

        switch (networkType) {
            case 'eth':
                let isSufficientFee = ringBalance.gte(crossChainFee);

                return (
                    <div className={styles.formBox}>
                        <div className={`${styles.networkBox} claims-network-box`}>
                            <Form.Group controlId="darwinaAddressGroup">
                                <AssetControl onChange={onAssetChange} tokenType={tokenType} displayDeposit></AssetControl> 
                                {
                                    tokenType === 'erc20' ? (
                                        <>
                                            <Form.Label>{t('crosschain:ERC-20 Token')}</Form.Label>
                                            <Form.Control 
                                                value={this.state.erc20Token?.name || this.state.erc20Token?.symbol || ''}
                                                onClick={() => this.setState({
                                                    isRegisterTokenModalDisplay: true
                                                })}
                                                onChange={() => { }}
                                                placeholder={t('crosschain:Select a token')}>
                                            </Form.Control>
                                        </> 
                                    ): null
                                }

                                <Form.Label>
                                    {t(tokenType === 'erc20' ? 'crosschain:Please enter Ethereum account or DVM account' : 'crosschain:Please enter the destination account of Darwinia mainnet')}
                                    <a href={this.renderHelpUrl()} target="_blank" rel="noopener noreferrer">
                                        <img alt="" className={styles.labelIcon} src={helpLogo} />
                                    </a>
                                </Form.Label>
                                <Form.Control 
                                    type="text" 
                                    autoComplete="off"
                                    isInvalid={this.state.accountValidation} 
                                    placeholder={t( tokenType === 'erc20' ? 'crosschain:Ethereum account or DVM account': 'crosschain:Darwinia Network account')}
                                    value={darwiniaAddress}
                                    onChange={(value) => {
                                        const address = value.target.value;

                                        if(tokenType !== 'erc20') {
                                            const ss58Address = convertSS58Address(address);

                                            this.setState({
                                                accountValidation: !!address ? !!ss58Address ? null : { msg: "crosschain:This address is not {{type}} smart account"} : null,
                                            });
                                        } else {
                                            this.setState({
                                                accountValidation: !!address ? Web3.utils.isAddress(address) ? null : { msg: "crosschain:This address is not Ethereum account or DVM account"} : null,
                                            });
                                        }

                                        this.setValue('darwiniaAddress', value, null);
                                    }} />
                                <Form.Control.Feedback type="invalid">
                                    {t(this.state.accountValidation?.msg, { type: config.NETWORK_NAME })}
                                </Form.Control.Feedback>
                                {
                                    !this.state.accountValidation && (<Form.Text className="text-muted">
                                        {t(tokenType === 'erc20' ? 'crosschain:Please be sure to fill in the real Ethereum account or DVM account, and keep the account recovery files such as mnemonic properly.' : 'crosschain:Please be sure to fill in the real Darwinia mainnet account, and keep the account recovery files such as mnemonic properly.')}
                                    </Form.Text>)
                                }
                                

                                {tokenType === 'ring' ?
                                    <>
                                        <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                        <InputRightWrap text={t('crosschain:MAX')} onClick={
                                            () => {
                                                this.setValue('crossChainBalance', { target: { value: formatBalance(ringBalance.gt(crossChainFee) ? ringBalance.sub(crossChainFee) : Web3.utils.toBN(0), 'ether') } }, this.toWeiBNMiddleware, this.setRingBalanceText)
                                            }
                                        }>
                                            <Form.Control type="number" placeholder={`${t('crosschain:Balance')} : ${formatBalance(this.state[`${tokenType}Balance`], 'ether')}`}
                                                autoComplete="off"
                                                value={crossChainBalanceText}
                                                onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setRingBalanceText)} />
                                        </InputRightWrap>
                                    </>
                                    : null}

                                {tokenType === 'erc20' ?
                                    <>
                                        <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                        <InputRightWrap text={t('crosschain:MAX')} onClick={
                                            () => {
                                                this.setValue('crossChainBalance', { target: { value: formatBalance(this.state.erc20Token?.balance, this.state.erc20Token?.decimals)} }, this.toWeiBNMiddleware, this.setRingBalanceText)
                                            }
                                        }>
                                            <Form.Control type="number" placeholder={`${t('crosschain:Balance')} : ${formatBalance(this.state.erc20Token?.balance, this.state.erc20Token?.decimals)}`}
                                                autoComplete="off"
                                                value={crossChainBalanceText}
                                                onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setRingBalanceText)} />
                                        </InputRightWrap>
                                    </>
                                    : null}

                                {tokenType === 'kton' ?
                                    <>
                                        <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                        <InputRightWrap text={t('crosschain:MAX')} onClick={
                                            () => {
                                                this.setValue('crossChainBalance', { target: { value: formatBalance(this.state[`${tokenType}Balance`], 'ether') } }, this.toWeiBNMiddleware, this.setRingBalanceText)
                                            }
                                        }>
                                            <Form.Control type="number" placeholder={`${t('crosschain:Balance')} : ${formatBalance(this.state[`${tokenType}Balance`], 'ether')}`}
                                                autoComplete="off"
                                                value={crossChainBalanceText}
                                                onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setRingBalanceText)} />
                                        </InputRightWrap>
                                    </>
                                    : null}

                                {tokenType === 'deposit' ?
                                    <>
                                        <Form.Label>{t('crosschain:Select Deposit')}</Form.Label>

                                        <Dropdown as={ButtonGroup} className={styles.reactSelect} onSelect={(eventKey) => {
                                            this.setState({
                                                currentDepositID: eventKey
                                            })
                                        }}>
                                            <Dropdown.Toggle as="div" className={styles.reactSelectToggle} id="ethereum-deposit-toggle">
                                                {this.renderDepositItem(this.getDepositByID(currentDepositID))}
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className="super-colors">
                                                {ethereumDeposits && ethereumDeposits.length > 0 && ethereumDeposits.map((item) => {
                                                    return <Dropdown.Item active={item.deposit_id === currentDepositID} key={item.deposit_id} eventKey={item.deposit_id}>{this.renderDepositItem(item)}</Dropdown.Item>
                                                })}
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </>
                                    : null}
                                {tokenType === 'ring' || tokenType === 'kton' ? <Form.Text muted className={`${styles.feeTip} ${isSufficientFee ? '' : 'text-muted'}`}>
                                    {t(`crosschain:Crosschain transfer fee. {{fee}} RING. (Account Balance. {{ring}} RING)`, {
                                        fee: formatBalance(crossChainFee, 'ether').toString(),
                                        ring: formatBalance(this.state[`ringBalance`], 'ether').toString()
                                    })}
                                </Form.Text> : null}
                            </Form.Group>

                            <div className={styles.buttonBox}>
                                {isAllowanceIssuing || tokenType === 'deposit' ?
                                    <Button disabled={(tokenType !== 'erc20' && !isSufficientFee && (tokenType !== 'deposit')) || isApproving} variant="color" onClick={() => {
                                        if(tokenType === 'erc20') {
                                            this.approveRingToIssuing();
                                        } else {
                                            this.redeemToken();
                                        }
                                    }}>{t('crosschain:Submit')}</Button> :
                                    <Button disabled={isApproving} variant="color" onClick={this.approveRingToIssuing}>{isApproving ? t('crosschain:Approving') : t('crosschain:Approve')}</Button>
                                }
                                <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                            </div>
                        </div>
                    </div>
                )
                case 'darwinia':
                    isSufficientFee = ringBalance.gte(crossChainFee);
                    return (
                        <div className={styles.formBox}>
                            <div className={`${styles.networkBox} claims-network-box`}>
                                <Form.Group controlId="darwiniaAddressGroup" className={styles.formInputBox}>
                                    <AssetControl onChange={onAssetChange} tokenType={tokenType}></AssetControl> 
                                    {
                                        tokenType === 'erc20' ? (<>
                                                <Form.Label>{t('crosschain:ERC-20 Token')}</Form.Label>
                                                <Form.Control value={this.state.erc20Token?.name || this.state.erc20Token?.symbol || ''} 
                                                    onChange={() => { }}
                                                    onClick={() => this.setState({
                                                        isRegisterTokenModalDisplay: true
                                                    })}
                                                    placeholder={t('crosschain:Select a token')} 
                                                />

                                                <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                                <InputRightWrap text={t('crosschain:MAX')} 
                                                    onClick={
                                                        () => {
                                                            this.setValue('crossChainBalance', { target: { value: formatBalance(this.state.erc20Token.balance, this.state.erc20Token?.decimals)} }, this.toWeiBNMiddleware, this.setRingBalanceText)
                                                        }
                                                    }
                                                >
                                                    <Form.Control type="number" placeholder={`${t('crosschain:Balance')} : ${formatBalance(this.state.erc20Token?.balance, this.state.erc20Token?.decimals)}`}
                                                        autoComplete="off"
                                                        value={crossChainBalanceText}
                                                        onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setRingBalanceText)} />
                                                </InputRightWrap>
                                        </>) : (
                                            <>

                                                <Form.Label>{t('crosschain:Token for cross-chain transfer', { token: 'RING' })}</Form.Label>
                                                <InputWrapWithCheck text={t('crosschain:MAX')} onClick={
                                                        () => {
                                                            this.setValue('crossChainBalance', { target: { value: formatBalance(ringBalance.gte(Web3.utils.toBN(2000000000).add(crossChainFee)) ? ringBalance.sub(Web3.utils.toBN(2000000000)).sub(crossChainFee) : Web3.utils.toBN(0), 'gwei') } }, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setRingBalanceText)
                                                        }
                                                    } label="RING" inputText={crossChainBalanceText} placeholder={`${t('crosschain:Balance')} : ${formatBalance(ringBalance, 'gwei')} RING`}  onChange={(value) => this.setValue('crossChainBalance', value, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setRingBalanceText)}
                                                    defaultIsDisable={false} 
                                                />

                                                <InputWrapWithCheck text={t('crosschain:MAX')} 
                                                    onClick={
                                                        () => {
                                                            this.setValue('crossChainKtonBalance', { target: { value: formatBalance(ktonBalance, 'gwei') } }, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setKtonBalanceText)
                                                        }
                                                    }
                                                    label="KTON"
                                                    inputText={crossChainKtonBalanceText}
                                                    placeholder={`${t('crosschain:Balance')} : ${formatBalance(ktonBalance, 'gwei')} KTON`}
                                                    onChange={(value) => this.setValue('crossChainKtonBalance', value, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setKtonBalanceText)}
                                                    defaultIsDisable={true}
                                                />

                                                <Form.Text muted className={`${styles.feeTip} ${isSufficientFee ? '' : 'text-muted'}`}>
                                                    {t(`crosschain:Crosschain transfer fee. {{fee}} RING. (Account Balance. {{ring}} RING)`, {
                                                        fee: formatBalance(crossChainFee, 'gwei').toString(),
                                                        ring: formatBalance(this.state[`ringBalance`], 'gwei').toString()
                                                    })}
                                                </Form.Text>

                                                <Form.Label>
                                                    {t('crosschain:Please select Darwinia mainnet sender account')}
                                                    <a href={this.renderHelpUrl()} target="_blank" rel="noopener noreferrer">
                                                        <img alt="" className={styles.labelIcon} src={helpLogo} />
                                                    </a>
                                                </Form.Label>
                                                <Form.Control as="select" value={account[networkType]}
                                                    onChange={(value) => this.setCurrentAccount('darwinia', value, async (account) => {
                                                        const balances = await getTokenBalance('darwinia', account);

                                                        this.setState({
                                                            ringBalance: Web3.utils.toBN(balances[0]),
                                                            ktonBalance: Web3.utils.toBN(balances[1]),
                                                            darwiniaAddress: convertSS58Address(account)
                                                        })
                                                    })}>
                                                    {
                                                        account[`${networkType}List`]?.map((item, index) => ( 
                                                            <option key={item.address} value={item.address}>{convertSS58Address(item.address, middleScreen)} - {item.meta.name}</option>
                                                        ))
                                                    }
                                                </Form.Control>
                                            </>
                                        )
                                    }

                                    <Form.Label>{t('crosschain:Please enter the destination account of Ethereum Network')}</Form.Label>
                                    <Form.Control type="text" autoComplete="off" placeholder={t('crosschain:Ethereum account')} value={recipientAddress}
                                        onChange={(value) => this.setValue('recipientAddress', value, null)} />
                                    <Form.Text className="text-muted">
                                        {t('crosschain:Please make sure to fill in an Ethereum network account that does not belong to the exchange')}
                                    </Form.Text>

                                    <FormTip text={[
                                        t(`crosschain:d2e crosschain gas tip 1`),
                                        t(`crosschain:d2e crosschain gas tip 2`)
                                    ]}/>
                                </Form.Group>
                                <div className={styles.buttonBox}>
                                    <Button variant="color" onClick={this.crossChainFromDarwiniaToEthereum}>{t('crosschain:Submit')}</Button>
                                    <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                                </div>
                            </div>
                        </div>
                    );
            case 'crab':
                return (
                    <div className={styles.formBox}>
                        <div className={`${styles.networkBox} claims-network-box`}>
                            <Form.Group controlId="darwinaAddressGroup">
                                <Form.Label>{t('crosschain:Please select Darwinia mainnet destination account')} <a href={this.renderHelpUrl()} target="_blank"
                                    rel="noopener noreferrer"><img alt=""
                                        className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                                <Form.Control as="select" value={account[networkType]}
                                    onChange={(value) => this.setCurrentAccount('crab', value, async (account) => {
                                        const balances = await getTokenBalance('crab', account);
                                        this.setState({
                                            ringBalance: Web3.utils.toBN(balances[0]),
                                            darwiniaAddress: convertSS58Address(account)
                                        })
                                    })}>
                                    {account[`${networkType}List`]?.map((item, index) => {
                                        return <option key={item.address} value={item.address}>{convertSS58Address(item.address, middleScreen)} - {item.meta.name}</option>
                                    })
                                    }
                                </Form.Control>
                                <Form.Label>{t('crosschain:Cross-chain transfer token')}</Form.Label>
                                <Form.Control as="select" value={tokenType}
                                    onChange={(value) => this.setValue('tokenType', value)}>
                                    <option value="ring">CRING</option>
                                </Form.Control>

                                <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                <InputRightWrap text={t('crosschain:MAX')} onClick={
                                    () => {
                                        this.setValue('crossChainBalance', { target: { value: formatBalance(ringBalance.gte(Web3.utils.toBN(2000000000)) ? ringBalance.sub(Web3.utils.toBN(2000000000)) : Web3.utils.toBN(0), 'gwei') } }, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setRingBalanceText)
                                    }
                                }>
                                    <Form.Control type="number" value={crossChainBalanceText}
                                        autoComplete="off"
                                        placeholder={`${t('crosschain:Balance')} : ${formatBalance(ringBalance, 'gwei')} CRING`}
                                        onChange={(value) => this.setValue('crossChainBalance', value, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setRingBalanceText)} />
                                </InputRightWrap>
                                <Form.Text className="text-muted">
                                    {t('crosschain:Note：Please keep at least {{fee}} as extrinsic fee', {
                                        fee: '2 CRING'
                                    })}
                                </Form.Text>
                            </Form.Group>
                            <div className={styles.buttonBox}>
                                <Button variant="color" onClick={this.buildInGenesis}>{t('crosschain:Submit')}</Button>
                                <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    checkedBall = (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({
            checkedBall: id,
            relatedBall: chainMap[id] || []
        })
    }

    splitNetworkStr = (str) => {
        if (!str) return ['', ''];
        return str.split('-');
    }

    step1 = () => {
        const { t, onChangePath, history } = this.props
        const { networkType, to } = this.state
        const isOpen = networkType === 'eth' || networkType === 'darwinia';

        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="networkSelectGroup">
                            <Form.Label>{t('crosschain:Select Chain')}</Form.Label>
                            <Form.Control as="select" value={`${networkType}-${to}`}
                                onChange={(value) => this.setValue('networkType', value, (value) => {
                                    return this.splitNetworkStr(value)[0];
                                }, (data) => {
                                    const networkType = this.splitNetworkStr(data);
                                    history.replace({
                                        hash: `#${parseChain(networkType[0])}`
                                    })
                                    this.setState({
                                        from: networkType[0],
                                        to: networkType[1],
                                    })
                                    onChangePath({
                                        from: parseChain(networkType[0]),
                                        to: parseChain(networkType[1])
                                    })
                                })}>
                                <option value="eth-darwinia">Ethereum -&gt; Darwinia MainNet</option>
                                <option value="darwinia-eth">Darwinia MainNet -&gt; Ethereum</option>
                                <option value="tron-darwinia">Tron -&gt; Darwinia MainNet</option>
                                <option value="crab-darwinia">Darwinia Crab -&gt; Darwinia MainNet</option>
                            </Form.Control>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="outline-purple" onClick={this.toResult}>{t('crosschain:search')}</Button>
                            <Button variant="outline-purple" disabled={!isOpen} onClick={() => this.toClaims(2)}>
                                {isOpen ? t(`crosschain:claim`) : t(`crosschain:come soon`)}
                            </Button>
                        </div>
                    </div>
                </div>

                {networkType === 'crab' ? <div className={styles.formBox}>
                    <div className={styles.stepRoadMap}>
                        <h3>{t('crosschain:Roadmap for cross-chain transfers')}</h3>
                        <div className={`${styles.stepRoadMapItem} ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus0} alt="end"></img><span>{t('crosschain:Phase 1')}</span></p>
                                <p>{t('crosschain:In progress')}</p>
                            </div>
                            <p>{t('crosschain:The RING in genesis swaps will arrive after launching the Darwinia mainnet and will be sent to the destination account by Genesis Block.')}</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p><img src={roadmapStatus1} alt="start"></img><span>{t('crosschain:Phase 2')}</span></p>
                                <p>2021</p>
                            </div>
                            <p>{t('crosschain:Cross-chain swaps at this stage will arrive immediately (network delays may occur),but only support One-way swaps to the Darwinia main network.')}</p>
                        </div>
                        <div className={`${styles.stepRoadMapItem} ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus2} alt="start"></img><span>{t('crosschain:Phase 3')}</span></p>
                                <p>2021</p>
                            </div>
                            <p>{t('crosschain:Cross-chain swaps at this stage will arrive immediately (network delays may occur), and support two-way or multi-way swaps.')}</p>
                        </div>
                    </div>
                </div> : null}

                {networkType === 'eth' || networkType === 'darwinia' ? <div className={styles.formBox}>
                    <div className={styles.stepRoadMap}>
                        <h3>{t('crosschain_ethtron:Roadmap for cross-chain transfers')}</h3>
                        <div className={`${styles.stepRoadMapItem} ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus0} alt="end"></img><span>{t('crosschain_ethtron:Phase 1')}</span></p>
                                <p>{t('crosschain:In progress')}</p>
                            </div>
                            <p>{t('crosschain_ethtron:The cross-chain transfers at this stage will arrive after launching the Darwinia mainnet and will be sent to the destination account by Genesis Block')}</p>
                        </div>
                        <div className={`${styles.stepRoadMapItem}  ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus0} alt="end"></img><span>{t('crosschain_ethtron:Phase 2')}</span></p>
                                <p>{'2020 Q4'}</p>
                            </div>
                            <p>{t('crosschain_ethtron:Cross-chain transfers at this stage will arrive immediately (network delays may occur),but only support One-way transfers to the Darwinia main network')}</p>
                        </div>
                        <div className={`${styles.stepRoadMapItem}`}>
                            <div>
                                <p><img src={roadmapStatusActive0} alt="end"></img><span>{t('crosschain_ethtron:Phase 3')}</span></p>
                                <p>{'2021 Q1'}</p>
                            </div>
                            <p>{t('crosschain_ethtron:Cross-chain transfers at this stage will arrive immediately (network delays may occur), and support two-way or multi-way transfers')}</p>
                        </div>
                    </div>
                </div> : null}

                {networkType === 'tron' ? <div className={styles.formBox}>
                    <div className={styles.stepRoadMap}>
                        <h3>{t('crosschain_ethtron:Roadmap for cross-chain transfers')}</h3>
                        <div className={`${styles.stepRoadMapItem} ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus0} alt="end"></img><span>{t('crosschain_ethtron:Phase 1')}</span></p>
                                <p>{t('crosschain:In progress')}</p>
                            </div>
                            <p>{t('crosschain_ethtron:The cross-chain transfers at this stage will arrive after launching the Darwinia mainnet and will be sent to the destination account by Genesis Block')}</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p><img src={roadmapStatus1} alt="start"></img><span>{t('crosschain_ethtron:Phase 2')}</span></p>
                                <p>{networkType === 'tron' ? '2021' : '2020 Q4'}</p>
                            </div>
                            <p>{t('crosschain_ethtron:Cross-chain transfers at this stage will arrive immediately (network delays may occur),but only support One-way transfers to the Darwinia main network')}</p>
                        </div>
                        <div className={`${styles.stepRoadMapItem} ${styles.stepRoadMapItemDone}`}>
                            <div>
                                <p><img src={roadmapStatus2} alt="start"></img><span>{t('crosschain_ethtron:Phase 3')}</span></p>
                                <p>{networkType === 'tron' ? '2021' : '2020 Q4'}</p>
                            </div>
                            <p>{t('crosschain_ethtron:Cross-chain transfers at this stage will arrive immediately (network delays may occur), and support two-way or multi-way transfers')}</p>
                        </div>
                    </div>
                </div> : null}
            </div>
        )
    }

    step2 = () => {
        const { t } = this.props
        const { networkType, account, status, darwiniaAddress, ringBalance, isApproving, ethereumDeposits, ktonBalance, tokenType, crossChainBalanceText, crossChainKtonBalanceText, crossChainBalance, isAllowanceIssuing, currentDepositID,
            crossChainFee, recipientAddress } = this.state
        const explorerUrl = this.renderExplorerUrl()
        const middleScreen = isMiddleScreen()

        return (
            <div>
                {this.renderHeader()}

                {/* current connected - ethereum, tron network */}
                {this.renderNetworkBox({
                    networkType, account, status, tokenType, t, darwiniaAddress, crossChainBalance, currentDepositID
                })}

                {/* form - ethereum, crab network */}

                {status === 2 && account.isReady ? this.renderForm(
                    {
                        networkType, account, t, tokenType , crossChainBalanceText, crossChainKtonBalanceText, currentDepositID, ethereumDeposits, crossChainFee,
                        darwiniaAddress, ringBalance, ktonBalance, isApproving, isAllowanceIssuing, middleScreen, recipientAddress
                    }
                ) : null}

                {!account.isReady ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box d-flex flex-column mt-3`}>
                        <Spinner className="align-self-center" animation="grow" />
                        <p className="align-self-center">{t('crosschain:Connecting node')}</p>
                    </div>
                </div> : null}

                {status === 3 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} ${styles.hashBox} claims-network-box`}>
                        <Form.Group controlId="signatureGroup">
                            <Form.Label>{t('crosschain:The transaction has been sent, please check the transfer progress in the cross-chain history.')}</Form.Label>
                            <a href={explorerUrl} target="_blank" rel="noopener noreferrer">{explorerUrl}</a>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="color" onClick={this.toResult}>{t('crosschain:search')}</Button>
                            <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}
            </div>
        )
    }

    step4 = () => {
        const { t } = this.props
        const { networkType, account, history, crabAndDarwiniaHistory } = this.state
        const middleScreen = isMiddleScreen()

        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectAccountBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>

                        {networkType === 'crab' || networkType === 'darwinia' ?
                        <>
                            <p>{convertSS58Address(account[networkType])}</p>
                            <Form.Row>
                                {crabAndDarwiniaHistory.isManual ?
                                    <Form.Group as={Col}>
                                        <Form.Control onChange={(value) => this.setCurrentAccount(networkType, value, async (account) => {
                                                const params = new URLSearchParams();
                                                const {hash} = this.props.location;

                                                if (account) {
                                                    params.append("address", account)
                                                } else {
                                                    params.delete("address")
                                                }
                                                this.props.history.replace({hash: hash, search: params.toString()})

                                                this.queryClaims()
                                            })}
                                            type="text" placeholder={t('crosschain:Please input the Darwinia address to be queried')} />
                                    </Form.Group> :
                                    <Form.Group as={Col} controlId="darwinaAddressGroup">
                                        <Form.Control as="select" value={account[networkType]}
                                            onChange={(value) => this.setCurrentAccount(networkType, value, async (account) => {
                                                // const balances = await getTokenBalance('crab', account);
                                                // this.setState({
                                                //     ringBalance: Web3.utils.toBN(balances[0]),
                                                //     darwiniaAddress: convertSS58Address(account)
                                                // })
                                                const params = new URLSearchParams();
                                                const {hash} = this.props.location;

                                                if (account) {
                                                    params.append("address", account)
                                                } else {
                                                    params.delete("address")
                                                }
                                                this.props.history.replace({hash: hash, search: params.toString()})

                                                this.queryClaims()
                                            })}>
                                                {account[`${networkType}List`]?.map((item, index) => {
                                                    return <option key={item.address} value={item.address}>{convertSS58Address(item.address, middleScreen)} - {item.meta.name}</option>
                                                })}
                                        </Form.Control>
                                    </Form.Group>}

                                    <Form.Group>
                                        <Button variant="primary" onClick={() => {
                                            if(crabAndDarwiniaHistory.isManual) {
                                                account[`${networkType}List`][0] && this.setCurrentAccount(networkType, {target: {value: account[`${networkType}List`][0].address}}, async (account) => {
                                                    const params = new URLSearchParams();
                                                    const {hash} = this.props.location;

                                                    if (account) {
                                                        params.append("address", account)
                                                    } else {
                                                        params.delete("address")
                                                    }
                                                    this.props.history.replace({hash: hash, search: params.toString()})

                                                    this.queryClaims()
                                                })
                                            }
                                            this.setState({crabAndDarwiniaHistory: {
                                                ...this.state.crabAndDarwiniaHistory,
                                                isManual: !crabAndDarwiniaHistory.isManual,
                                                address: ''
                                            }})
                                        }
                                        }>{crabAndDarwiniaHistory.isManual ? t('crosschain:Extension') : t('crosschain:Manual')}</Button>
                                    </Form.Group>
                            </Form.Row>
                        </> : <p>{account[networkType]}</p>}
                    </div>
                    {networkType === 'eth' || networkType === 'tron' ? <HistoryRecord history={history} /> : null}
                    {networkType === 'darwinia' ? this.d2eHistory() : null}
                    {networkType === 'crab' ? this.renderCrabHistory(history) : null}

                    <div className={styles.buttonBox}>
                        <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                    </div>
                </div>
            </div>
        )
    }

    d2eHistory() {
        const { t } = this.props;
        const { history, historyMeta, erc20HistoryMeta, erc20History } = this.state;
        
        return (<>
            {!history || !erc20History ?
                <div className="d-flex flex-wrap justify-content-center pb-4">
                    <Spinner animation="border" />
                </div>
                : null}
            {history && history.length === 0 && erc20History && erc20History.length === 0 ?
                <div className={styles.historyEmpty}>
                    <p>{t('crosschain:No Cross-chain transfer history')}</p>
                </div>
                : null}
            {this.renderDarwiniaToEthereumHistory(
                history,
                historyMeta,
                item => `${formatBalance(Web3.utils.toBN(item.ring_value), 'gwei')} RING ${item.kton_value !== '0' ? (' / ' + formatBalance(Web3.utils.toBN(item.kton_value), 'gwei') + ' KTON'): "" }`
            )}
            {this.renderDarwiniaToEthereumHistory(
                erc20History,
                erc20HistoryMeta,
                item => `${formatBalance(decodeUint256(item.value), 'ether')} ${item.symbol}`,
                true
            )}
        </>);
    }
    
    renderDarwiniaToEthereumHistory = (history, historyMeta, getAmountFn, isErc20 = false) => {
        const { t } = this.props;

        return <>
            {history ? history.map((item) => {
                let step = 2;

                if (item.signatures) {
                    step = 3;
                }
                if (item.signatures && item.tx !== "") {
                    step = 4;
                }

                return (<div className={styles.historyItem} key={item.extrinsic_index}>
                    <div>
                        <h3>{t('crosschain:Time')}</h3>
                        <p>{dayjs.unix(item.block_timestamp).format('YYYY-MM-DD HH:mm:ss ZZ')}</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Cross-chain direction')}</h3>
                        <p>{isErc20 ? 'DVM' : 'Darwinia Mainnet'} -&gt; Ethereum</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Amount')}</h3>
                        <p>{getAmountFn(item)}</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Destination account')}</h3>
                        <p>{item.target}</p>
                    </div>
                    <div className={styles.line}></div>
                    {this.renderTransferProgress('darwinia', 'eth', step, {
                        from: {
                            tx: item.extrinsic_index,
                            chain: 'darwinia'
                        },
                        to: {
                            tx: item.tx,
                            chain: 'eth'
                        },
                    }, true, () => item.signatures && !item.tx ? isErc20 ? <Button 
                            className={styles.hashBtn}
                            onClick={async () => {
                                this.setState({
                                    crabAndDarwiniaHistory: {
                                        ...this.state.crabAndDarwiniaHistory,
                                        isFetchingClaimParams: true
                                    }
                                });
                                const { signatures, mmr_root, mmr_index, block_header, block_hash, block_num } = item;
                                const mptProof = await getMPTProof(block_hash, config.PROOF_ADDRESS);
                                const { peaks, siblings } = await getMMRProof(block_num, mmr_index, block_hash);

                                try {
                                    const tx = await claimErc20Token({
                                        signatures,
                                        mmr_root,
                                        mmr_index,
                                        block_header,
                                        peaks,
                                        siblings,
                                        eventsProofStr: mptProof.toHex(),
                                    });

                                    this.setModalHash(tx.transactionHash);
                                    this.setModalShow(true);
                                } catch(error) {
                                    console.warn('%c [ error ]-1647', 'font-size:13px; background:pink; color:#bf2c9f;', error.message);
                                } finally {
                                    this.setState({
                                        crabAndDarwiniaHistory: {
                                            ...this.state.crabAndDarwiniaHistory,
                                            isFetchingClaimParams: false
                                        }
                                    });
                                }
                            }}
                        >{t('crosschain:Claim')}</Button> : 
                        <Button variant="outline-purple"
                            disabled={this.state.crabAndDarwiniaHistory.isFetchingClaimParams}
                            className={styles.hashBtn}
                            onClick={() => {
                                this.setState({
                                    crabAndDarwiniaHistory: {
                                        ...this.state.crabAndDarwiniaHistory,
                                        isFetchingClaimParams: true
                                    }
                                })
                                ClaimTokenFromD2E({
                                    networkPrefix: config.D2E_NETWORK_PREFIX,
                                    mmrIndex: item.mmr_index,
                                    mmrRoot: item.mmr_root,
                                    mmrSignatures: item.signatures,
                                    blockNumber: item.block_num,
                                    blockHeaderStr: item.block_header,
                                    blockHash: item.block_hash,
                                    historyMeta: historyMeta
                                }, (result) => {
                                    this.setState({
                                        crabAndDarwiniaHistory: {
                                            ...this.state.crabAndDarwiniaHistory,
                                            isFetchingClaimParams: false
                                        }
                                    })

                                    this.setModalHash(result);
                                    this.setModalShow(true);
                                } , () => {
                                    this.setState({
                                        crabAndDarwiniaHistory: {
                                            ...this.state.crabAndDarwiniaHistory,
                                            isFetchingClaimParams: false
                                        }
                                    })
                                }, t);
                            }} >{t('crosschain:Claim')}</Button> : null
                        )
                    }
                </div>)
            }) : null}
        </>
    }

    renderCrabHistory = (history) => {
        const { t } = this.props;
        return <>
            {!history ?
                <div className="d-flex flex-wrap justify-content-center pb-4">
                    <Spinner animation="border" />
                </div>
                : null}
            {history && history.length === 0 ?
                <div className={styles.historyEmpty}>
                    <p>{t('crosschain:No Cross-chain transfer history')}</p>
                </div>
                : null}
            {history ? history.map((item) => {
                return (<div className={styles.historyItem} key={item.extrinsic_index}>
                    <div>
                        <h3>{t('crosschain:Time')}</h3>
                        <p>{dayjs.unix(item.timestamp).format('YYYY-MM-DD HH:mm:ss ZZ')}</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Cross-chain direction')}</h3>
                        <p>{textTransform(parseChain('crab'), 'capitalize')} -&gt; Darwinia MainNet</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Amount')}</h3>
                        <p>{formatBalance(Web3.utils.toBN(item.amount), 'gwei')} CRING -&gt; {formatBalance(Web3.utils.toBN(item.amount).divn(100), 'gwei')} RING</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Destination account')}</h3>
                        <p>{item.target}</p>
                    </div>
                    <div className={styles.line}></div>
                    {this.renderTransferProgress('crab', 'darwinia', 4, {
                        from: {
                            tx: item.extrinsic_index,
                            chain: 'crab'
                        }
                    }, false)}

                </div>)
            }) : null}
        </>
    }

    isBallActive = (id) => {
        const { relatedBall, checkedBall } = this.state;
        if (!checkedBall || checkedBall === id) {
            return [true, checkedBall === id ? 1 : 0]
        }
        const isRelatedBall = relatedBall.includes(id)
        return [isRelatedBall, isRelatedBall ? 2 : -1]
    }

    fn_airdrop = () => {
        this.setState({
            status: 1
        })
    }

    fn_wrapper = (e, fnname, from, to) => {
        e.stopPropagation()
        this[`fn_${fnname}`] && this[`fn_${fnname}`]()
        this.setState({
            from, to
        })
    }

    renderProgress = (current, threshold, isStyle = true) => {
        const className = current >= threshold ? '' : 'Inactive'
        return isStyle ? styles[className] : className
    }

    renderTransferProgress = (from, to, step, hash, hasRelay = false, relayButton = null) => {
        const RelayButton = relayButton && relayButton();
        const { t } = this.props;

        return (
            <div className={styles.transferProgress}>
                <div className={styles.iconBox}>
                    <div><img src={stepStartIcon} alt="tx"></img></div>
                    <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 2, false)}${textTransform(from, 'capitalize')}Icon`]} alt="tx"></img></div>
                    {hasRelay ? <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 3, false)}RelayIcon`]} alt="tx"></img></div> : null}
                    <div className={`${this.renderProgress(step, 4)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 4, false)}${textTransform(to, 'capitalize')}Icon`]} alt="tx"></img></div>
                </div>
                <div className={styles.titleBox}>
                    <div>
                        <p>{t('crosschain:Transaction Send')}</p>
                    </div>
                    <div className={`${this.renderProgress(step, 2)}`}>
                        <p>{t(`crosschain:${textTransform(parseChain(from), 'capitalize')} Confirmed`)}</p>
                        <Button className={styles.hashBtn} variant="outline-purple" target="_blank" href={this.renderExplorerUrl(hash.from.tx, hash.from.chain)}>{t('crosschain:Txhash')}</Button>
                    </div>
                    {hasRelay ? <div className={`${this.renderProgress(step, 3)}`}>
                        <p>{t(`crosschain:ChainRelay Confirmed`)}</p>
                        { RelayButton ? RelayButton : null}
                    </div> : null}
                    <div className={`${this.renderProgress(step, 4)}`}>
                        <p>{t(`crosschain:${textTransform(parseChain(to), 'capitalize')} Confirmed`)}</p>
                        {step >= 4 && hash.to && hash.to.tx ? <Button className={styles.hashBtn} variant="outline-purple" target="_blank" href={this.renderExplorerUrl(hash.to.tx, hash.to.chain)}>{t('crosschain:Txhash')}</Button> : null}
                    </div>
                </div>
            </div>
        )
    }

    renderBall = (id, styleId) => {
        const { checkedBall } = this.state
        const isBallActive = this.isBallActive(id)
        const isDisableBallClass = isBallActive[0] ? '' : styles.disableBall
        const isDisableBallShadowClass = isBallActive[0] ? '' : styles.disableBallShadow
        return (
            <>
                <div className={`${styles['ball' + styleId]} ${isDisableBallClass}`} onClick={(e) => this.checkedBall(id, e)}>
                    <p>{id}</p>
                </div>
                <div className={`${styles[`ball${styleId}Shadow`]} ${isDisableBallShadowClass}`}></div>
                {isBallActive[1] === 2 && chainMap[`${checkedBall}_${id}`] && chainMap[`${checkedBall}_${id}`].length ?
                    chainMap[`${checkedBall}_${id}`].map((item) => {
                        return <div className={`${styles[`ball${styleId}Btn`]}`} onClick={(e) => this.fn_wrapper(e, item, checkedBall, id)}>{item}</div>
                    })
                    : ''}
            </>
        )
    }

    renderHelpUrl = () => {
        const lng = i18n.language.indexOf('en') > -1 ? 'en' : 'zh-CN'
        return `https://docs.darwinia.network/docs/${lng}/wiki-tut-create-account`
    }

    renderExplorerUrl = (_hash, _networkType) => {
        const lng = i18n.language.indexOf('en') > -1 ? 'en' : 'zh'
        const { txhash, networkType } = this.state
        const domain = {
            eth: `${config.ETHERSCAN_DOMAIN[lng]}/tx/`,
            tron: `${config.TRONSCAN_DOMAIN}/#transaction/`,
            crab: `https://crab.subscan.io/extrinsic/`,
            pangolin: `https://pangolin.subscan.io/extrinsic/`,
            darwinia: `${config.SUBSCAN_DARWINIA_DOMAIN}/extrinsic/`,
        }

        let urlHash = _hash || txhash;
        if ((_networkType || networkType) === 'tron') {
            urlHash = remove0x(urlHash)
        }
        return `${domain[_networkType || networkType]}${urlHash}`
    }

    render() {
        const { status, d2eModalData } = this.state
        const { t } = this.props

        return (
            <div>
                <div className={styles.claimBox}>
                    {status === 1 ? this.step1() : null}
                    {status === 2 || status === 3 ? this.step2() : null}
                    {status === 4 ? this.step4() : null}
                </div>

                <Modal
                    show={d2eModalData.isShow}
                    onHide={() => this.setModalShow(false)}
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    >
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">
                            {t('crosschain:Transaction feedback')}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>
                            {t('crosschain:The transaction has been sent, the transaction results can be tracked through the block explorer. No need to send the transaction repeatedly before the transaction result comes out.')}
                            <a rel="noopener noreferrer" target="_blank" href={this.renderExplorerUrl(d2eModalData.hash, 'eth')}>{t('crosschain:View on etherscan')}</a>
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="purple" onClick={() => this.setModalShow(false)}>{t('crosschain:Close')}</Button>
                    </Modal.Footer>
                </Modal>

                <Erc20Token show={this.state.isRegisterTokenModalDisplay}
                    networkType={this.state.networkType}
                    onHide={async (token) => {
                        if(token) {
                            const { networkType } = this.state;
                            const currentAccount = await getMetamaskActiveAccount();
                            const isAllowanceIssuing = await hasApproved(token, currentAccount, networkType);

                            this.setState({ erc20Token: token, isAllowanceIssuing });
                        } else {
                            this.setState({ isAllowanceIssuing: false, erc20token: null });
                        }

                        this.setState({isRegisterTokenModalDisplay: false});
                    }} />
                
                <Alert show={!!this.state.erc20TokenTransferState} 
                    onClose={() => this.setState({ erc20TokenTransferState: null })}
                    variant={this.state.erc20TokenTransferState?.transferTxHash ? 'success' : 'info'} 
                    dismissible
                    style={{position: 'fixed', top: '54px', right: '10px', maxWidth: '500px', zIndex: 99 }}
                >
                    <Alert.Heading>
                        <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            {t('crosschain:Transfer State')}
                            {
                                this.state.erc20TokenTransferState && !this.state.erc20TokenTransferState.transferTxHash &&
                                <span style={{fontSize: 10, marginLeft: 10}}>
                                    <Spinner animation="border" size="sm" variant="danger" />
                                </span>
                            }
                        </div>
                    </Alert.Heading>
                        
                    {this.state.erc20TokenTransferState?.approveTxHash && (<p>{t('crosschain:Approve transaction hash - {{hash}}', { hash: this.state.erc20TokenTransferState?.approveTxHash })}</p>)}
                    {this.state.erc20TokenTransferState?.transferTxHash && (<p>{t('crosschain:Transfer transaction hash - {{hash}}', { hash: this.state.erc20TokenTransferState?.transferTxHash })}</p>)}
                </Alert>

            </div>
        );
    }
}

export default withRouter(withTranslation()(CrossChain));
