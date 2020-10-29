import React, { Component } from "react";
import { Button, Form, Spinner, Dropdown, ButtonGroup } from 'react-bootstrap'
import { withRouter } from 'react-router-dom';

import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import _ from 'lodash';
import { encodeAddress } from '@polkadot/util-crypto';
import {
    connect, sign, formToast, getAirdropData, config, formatBalance, getBuildInGenesisInfo,
    getTokenBalance, buildInGenesis, textTransform, remove0x, convertSS58Address, isMiddleScreen,
    getCringGenesisSwapInfo, redeemToken, redeemDeposit, checkIssuingAllowance, approveRingToIssuing, getEthereumBankDeposit,
    getEthereumToDarwiniaCrossChainInfo, getEthereumToDarwiniaCrossChainFee
} from './utils'
import { InputRightWrap } from '../../components/InputRightWrap'
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

import stepEthereumIcon from './img/tx-step-eth-icon.svg';
import stepTronIcon from './img/tx-step-tron-icon.svg';
import stepDarwiniaIcon from './img/tx-step-darwinia-icon.svg';
import stepCrabIcon from './img/tx-step-crab-icon.svg';
import stepRelayIcon from './img/tx-step-relay-icon.svg';

import stepInactiveEthereumIcon from './img/tx-step-eth-inactive-icon.svg';
import stepInactiveTronIcon from './img/tx-step-tron-inactive-icon.svg';
import stepInactiveDarwiniaIcon from './img/tx-step-darwinia-inactive-icon.svg';
import stepInactiveCrabIcon from './img/tx-step-crab-inactive-icon.svg';
import stepInactiveRelayIcon from './img/tx-step-relay-inactive-icon.svg';

import roadmapStatus0 from './img/roadmap-status-0.svg';
import roadmapStatus1 from './img/roadmap-status-1.svg';
import roadmapStatus2 from './img/roadmap-status-2.svg';

import chainMap from './chain';

const txProgressIcon = {
    stepStartIcon,

    stepEthIcon: stepEthereumIcon,
    stepInactiveEthIcon: stepInactiveEthereumIcon,

    stepDarwiniaIcon,
    stepInactiveDarwiniaIcon,

    stepTronIcon,
    stepInactiveTronIcon,

    stepCrabIcon,
    stepInactiveCrabIcon,

    stepRelayIcon,
    stepInactiveRelayIcon
}

class Claims extends Component {
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
                isReady: false
            },
            signature: '',
            darwiniaAddress: '',
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
            hash: '',
            txhash: '',
            history: null,
            isAllowanceIssuing: false,
            isApproving: false,
            currentDepositID: null,
            crossChainFee: Web3.utils.toBN(0),
        }
        this.querySubscribe = null
    }

    componentDidMount() {
        this.routerHandle()
    }

    routerHandle = (location) => {
        const { hash } = location || this.props.location;
        const { onChangePath } = this.props
        if (hash === '#tron') {
            this.setState({ networkType: 'tron' })
            onChangePath({
                from: 'tron'
            })
        }
        if (hash === '#ethereum') {
            this.setState({ networkType: 'eth' })
            onChangePath({
                from: 'ethereum'
            })
        }

        if (hash === '#crab') {
            this.setState({ networkType: 'crab' })
            onChangePath({
                from: 'crab'
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

    setBNValue = (value) => {
        this.setState({
            crossChainBalanceText: value
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

    toWeiBNMiddleware = (num = 0, unit = 'ether') => {
        try {
            if (num) {
                return Web3.utils.toBN(Web3.utils.toWei(num, unit))
            }
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

    toClaims = (status = 2) => {
        const { networkType, account } = this.state;
        const { t } = this.props;
        this.initForm()
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
                    isReady: false
                }
            }, async () => {
                if (this.state.account[_networkType]) {
                    this.setState({
                        status: status
                    })
                    // this.airdropData()
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

                    console.log('ethereumDeposits', ethereumDeposits)
                    this.setState({
                        ringBalance: Web3.utils.toBN(balances[0]),
                        ktonBalance: Web3.utils.toBN(balances[1]),
                        isAllowanceIssuing: isAllowance,
                        ethereumDeposits: ethereumDeposits,
                        currentDepositID: ethereumDeposits.length > 0 ? ethereumDeposits[0].deposit_id : null,
                        crossChainFee: Web3.utils.toBN(crossChainFee)
                    })

                    this.setState({
                        account: {
                            ...this.state.account,
                            isReady: true
                        }
                    })
                }
            })
        }, t);
    }

    sign = async () => {
        const { networkType, account, darwiniaAddress } = this.state;
        const { t } = this.props;
        sign(networkType, account[networkType], darwiniaAddress, (signature) => {
            this.setState({
                signature: signature,
                status: 3
            })
        }, t)
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

    redeemToken = () => {
        const { networkType, account, darwiniaAddress, crossChainBalance, tokenType, currentDepositID } = this.state;
        const { t } = this.props;

        if (!this.checkForm(networkType === 'crab' ? 'gwei' : 'ether', tokenType)) return;

        if(tokenType === 'ring' || tokenType === 'kton') {
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
        const { networkType, account } = this.state;

        approveRingToIssuing(account[networkType], () => {
            this.setState({
                isApproving: true
            })
        }, async () => {
            if(!this.state.isAllowanceIssuing) {
                const isAllowance = await checkIssuingAllowance(account[networkType]);
                this.setState({
                    isApproving: false,
                    isAllowanceIssuing: isAllowance
                })
            }
        } )
    }

    checkForm = (unit = 'ether') => {
        const { crossChainBalance, crossChainBalanceText, ringBalance, ktonBalance, tokenType, currentDepositID } = this.state;
        const balance = {
            ringBalance,
            ktonBalance
        }
        const { t } = this.props;

        if(tokenType === 'deposit') {
            if(_.isNull(currentDepositID)) {
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
            formToast(t(`The amount exceeds the account available balance`))
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

        switch (networkType) {
            case "eth":
                address = account[networkType]
                let ethereumGenesisInfo = new Promise((resolve, reject) => {
                    getBuildInGenesisInfo({
                        query: { address: address },
                        method: "get"
                    }, (data) => {
                        resolve(data);
                    }, () => {
                        resolve([]);
                    });
                })

                let ethereumToDarwiniaCrosschainInfo = new Promise((resolve, reject) => {
                    getEthereumToDarwiniaCrossChainInfo({
                        query: { address: address },
                        method: "get"
                    }, (data) => {
                        resolve(data);
                    }, () => {
                        resolve([]);
                    });
                })

                Promise.all([ethereumGenesisInfo, ethereumToDarwiniaCrosschainInfo]).then(([genesisHistory, crosschainHistory]) => {
                    this.setState({
                        history: [...crosschainHistory.map((item) => {
                            item.is_crosschain = true;
                            return item;
                        }), ...genesisHistory]
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
            default:
                break;
        }
    }

    goBack = (status = 1) => {
        if (status === 1) {
            this.setState({
                hasFetched: false
            })
        }
        this.setState({
            status: status
        })
    }

    airdropData = () => {
        const { networkType, account } = this.state;
        const airdropNumber = getAirdropData(networkType, account[networkType]);
        this.setState({
            airdropNumber: airdropNumber
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
        if(!deposit) return <p>{t('crosschain:No Deposits')}</p>;
        if(Array.isArray(deposit) && deposit.length === 0) return <p>{t('crosschain:No Deposits')}</p>
        if(Array.isArray(deposit) && deposit.length > 0) {
            deposit = deposit[0]
        }

        const depositStartTime = dayjs.unix(deposit.deposit_time);
        const depositEndTime = depositStartTime.add(30 * deposit.duration, 'day');

        return <p>{deposit.amount} RING <span className={styles.depositItem}>({t('crosschain:Deposit ID')}: {deposit.deposit_id} {t('Time')}: {depositStartTime.format('YYYY/MM/DD')} - {depositEndTime.format('YYYY/MM/DD')})</span></p>;
    }

    renderDepositHistoryDetail = (amount, deposit) => {
        const { t } = this.props;
        if(!deposit) return null;

        const depositStartTime = dayjs.unix(deposit.start);
        const depositEndTime = depositStartTime.add(30 * deposit.month, 'day');

        return <p>{formatBalance(Web3.utils.toBN(amount), 'ether')} RING ({t('crosschain:Time')}: {depositStartTime.format('YYYY/MM/DD')} - {depositEndTime.format('YYYY/MM/DD')})</p>;
    }

    getDepositByID = (id) => {
        const { ethereumDeposits } = this.state;
        if(!ethereumDeposits) {
            return null
        }

        const r = ethereumDeposits.filter((deposit) => {
            return deposit.deposit_id === parseInt(id);
        })

        return r
    }

    checkedBall = (id, e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({
            checkedBall: id,
            relatedBall: chainMap[id] || []
        })
    }

    step1 = () => {
        const { t, onChangePath, history } = this.props
        const { networkType } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="networkSelectGroup">
                            <Form.Label>{t('crosschain:Select Chain')}</Form.Label>
                            <Form.Control as="select" value={networkType}
                                onChange={(value) => this.setValue('networkType', value, null, (data) => {
                                    history.replace({
                                        hash: `#${parseChain(data)}`
                                    })
                                    onChangePath({
                                        from: parseChain(data)
                                    })
                                })}>
                                <option value="eth">Ethereum -> Darwinia MainNet</option>
                                <option value="tron">Tron -> Darwinia MainNet</option>
                                <option value="crab">Darwinia Crab -> Darwinia MainNet</option>
                            </Form.Control>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="outline-purple" onClick={this.toResult}>{t('crosschain:search')}</Button>
                            <Button variant="outline-purple" disabled={networkType !== 'eth'} onClick={() => this.toClaims(2)}>{networkType === 'eth' ? t(`crosschain:claim`) : t(`crosschain:come soon`)}</Button>
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

                {networkType === 'eth' || networkType === 'tron'  ? <div className={styles.formBox}>
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
        const { networkType, account, status, darwiniaAddress, ringBalance, isApproving, ethereumDeposits, ktonBalance, tokenType, crossChainBalanceText, crossChainBalance, isAllowanceIssuing, currentDepositID,
            crossChainFee } = this.state
        const explorerUrl = this.renderExplorerUrl()
        const middleScreen = isMiddleScreen()

        const isSufficientFee = ringBalance.gte(crossChainFee);

        return (
            <div>
                {this.renderHeader()}
                {/* current connected - ethereum, tron network */}
                {networkType === 'eth' || networkType === 'tron' ? <div className={styles.formBox}>
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

                {/* form - ethereum, tron network */}
                {status === 2 && account.isReady && (networkType === 'eth' || networkType === 'tron') ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="darwinaAddressGroup">
                            <Form.Label>{t('crosschain:Please enter the destination account of Darwinia mainnet')} <a href={this.renderHelpUrl()} target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder={t('crosschain:Darwinia Network account')} value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value, null)} />
                            <Form.Text className="text-muted">
                                {t('crosschain:Please be sure to fill in the real Darwinia mainnet account, and keep the account recovery files such as mnemonic properly.')}
                            </Form.Text>

                            <Form.Label>{t('crosschain:Asset Types')}</Form.Label>
                            <Form.Control as="select" value={tokenType}
                                onChange={(value) => this.setValue('tokenType', value, null, () => {
                                    this.setState({
                                        crossChainBalanceText: ''
                                    })
                                })}>
                                <option value="ring">RING</option>
                                <option value="kton">KTON</option>
                                <option value="deposit">{t('crosschain:Deposit')}</option>
                            </Form.Control>

                            {tokenType === 'kton' || tokenType === 'ring' ?
                                <>
                                    <Form.Label>{t('crosschain:Amount')}</Form.Label>
                                    <InputRightWrap text={t('crosschain:MAX')} onClick={
                                        () => {
                                            this.setValue('crossChainBalance', {target: {value: formatBalance(this.state[`${tokenType}Balance`], 'ether')}}, this.toWeiBNMiddleware, this.setBNValue)
                                        }
                                    }>
                                        <Form.Control type="number" placeholder={`${t('crosschain:Balance')} : ${formatBalance(this.state[`${tokenType}Balance`], 'ether')}`}
                                            autoComplete="off"
                                            value={crossChainBalanceText}
                                            onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setBNValue)} />
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
                                        {/* {!ethereumDeposits || ethereumDeposits.length === 0 ?
                                            <Dropdown.Toggle id="ethereum-deposit">{t('No Deposits')}</Dropdown.Toggle>
                                            : null
                                        } */}
                                        <Dropdown.Toggle as="div" className={styles.reactSelectToggle} id="ethereum-deposit-toggle">
                                            {this.renderDepositItem(this.getDepositByID(currentDepositID))}
                                            </Dropdown.Toggle>
                                        <Dropdown.Menu className="super-colors">
                                        {ethereumDeposits && ethereumDeposits.length > 0 && ethereumDeposits.map((item) => {
                                            return <Dropdown.Item active={item.deposit_id === currentDepositID} key={item.deposit_id} eventKey={item.deposit_id}>{this.renderDepositItem(item)}</Dropdown.Item>
                                        })}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                    {/* <Form.Control as="select" value={currentDepositID}
                                        onChange={(value) => this.setValue('currentDepositID', value, null, () => {

                                        })}>
                                        {!ethereumDeposits || ethereumDeposits.length === 0 ?
                                            <option value="">{t('No Deposits')}</option>
                                            : null
                                        }
                                        {ethereumDeposits && ethereumDeposits.length > 0 && ethereumDeposits.map((item) => {
                                            return <option key={item.deposit_id} value={item.deposit_id}>{this.renderDepositItem(item)}</option>
                                        })}
                                    </Form.Control> */}
                                </>
                            : null}
                            <Form.Text muted className={`${styles.feeTip} ${isSufficientFee ? '' : 'text-muted'}`}>
                                {t(`crosschain:Crosschain transfer fee. {{fee}} RING. (Account Balance. {{ring}} RING)`, {
                                    fee: formatBalance(crossChainFee, 'ether').toString(),
                                    ring: formatBalance(this.state[`ringBalance`], 'ether').toString()
                                })}
                            </Form.Text>
                        </Form.Group>

                        <div className={styles.buttonBox}>
                            { isAllowanceIssuing || tokenType === 'deposit' ?
                                <Button disabled={!isSufficientFee} variant="color" onClick={this.redeemToken}>{t('crosschain:Submit')}</Button> :
                                <Button disabled={isApproving} variant="color" onClick={this.approveRingToIssuing}>{isApproving ? t('crosschain:Approving') : t('crosschain:Approve')}</Button>
                            }
                            <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}

                {/* form - crab network */}
                {status === 2 && account.isReady && (networkType === 'crab') ? <div className={styles.formBox}>
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
                                    this.setValue('crossChainBalance', {target: {value: formatBalance(ringBalance.gte(Web3.utils.toBN(2000000000)) ? ringBalance.sub(Web3.utils.toBN(2000000000)) : Web3.utils.toBN(0), 'gwei')}}, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setBNValue)
                                }
                            }>
                                <Form.Control type="number" value={crossChainBalanceText}
                                    autoComplete="off"
                                    placeholder={`${t('crosschain:Balance')} : ${formatBalance(ringBalance, 'gwei')} CRING`}
                                    onChange={(value) => this.setValue('crossChainBalance', value, (value) => this.toWeiBNMiddleware(value, 'gwei'), this.setBNValue)} />
                            </InputRightWrap>
                            <Form.Text className="text-muted">
                                {t('crosschain:Note：Please keep at least 2 CRING as extrinsic fee')}
                                </Form.Text>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="color" onClick={this.buildInGenesis}>{t('crosschain:Submit')}</Button>
                            <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}

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
        const { networkType, account, history } = this.state
        const middleScreen = isMiddleScreen()
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectAccountBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>
                        {networkType === 'crab' ? <Form.Group controlId="darwinaAddressGroup">
                            <Form.Control as="select" value={account[networkType]}
                                onChange={(value) => this.setCurrentAccount('crab', value, async (account) => {
                                    // const balances = await getTokenBalance('crab', account);
                                    // this.setState({
                                    //     ringBalance: Web3.utils.toBN(balances[0]),
                                    //     darwiniaAddress: convertSS58Address(account)
                                    // })
                                    this.queryClaims()
                                })}>
                                {account[`${networkType}List`]?.map((item, index) => {
                                    return <option key={item.address} value={item.address}>{convertSS58Address(item.address, middleScreen)} - {item.meta.name}</option>
                                })
                                }
                            </Form.Control>
                        </Form.Group> : null}
                    </div>
                    {networkType === 'eth' || networkType === 'tron' ? this.renderEthereumTronHistory(history) : null}
                    {networkType === 'crab' ? this.renderCrabHistory(history) : null}
                    <div className={styles.buttonBox}>
                        <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                    </div>
                </div>
            </div>
        )
    }

    renderEthereumTronHistory = (history) => {
        const { t } = this.props;
        return <>
            {!history ?
                <div className="d-flex flex-wrap justify-content-center pb-4">
                    <Spinner animation="border" />
                </div>
                : null}
            {history && history.length === 0 ?
                <div className={styles.historyEmpty}>
                    <p>{t('No Cross-chain transfer history')}</p>
                </div>
                : null}
            {history ? history.map((item) => {
                let step = 2;
                const isDeposit = item.currency.toUpperCase() === 'DEPOSIT';
                let depositInfo = JSON.parse(item.deposit || '{}');

                if(item.is_crosschain) {
                    if(item.is_relayed) {
                        step = 3;
                    }
                    if(item.is_relayed && item.darwinia_tx !== "") {
                        step = 4;
                    }
                } else {
                    step = 4;
                }

                return (<div className={styles.historyItem} key={item.tx}>
                    <div>
                        <h3>{t('crosschain:Time')}</h3>
                        <p>{dayjs.unix(item.block_timestamp).format('YYYY-MM-DD HH:mm:ss ZZ')}</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Cross-chain direction')}</h3>
                        <p>{textTransform(parseChain(item.chain), 'capitalize')} -> Darwinia MainNet</p>
                    </div>
                    {isDeposit ?
                        <>
                            <div>
                                <h3>{t('crosschain:Asset')}</h3>
                                <p>{t('crosschain:Deposit ID')}: {depositInfo.deposit_id}</p>
                            </div>
                            <div>
                                <h3>{t('crosschain:Detail')}</h3>
                                {this.renderDepositHistoryDetail(item.amount, depositInfo)}
                            </div>
                        </> :
                        <div>
                            <h3>{t('crosschain:Amount')}</h3>
                            <p>{formatBalance(Web3.utils.toBN(item.amount), 'ether')} {item.currency.toUpperCase()}</p>
                        </div>
                    }
                    <div>
                        <h3>{t('crosschain:Destination account')}</h3>
                        <p>{encodeAddress('0x' + item.target, 18)}</p>
                    </div>
                    <div className={styles.line}></div>
                    {this.renderTransferProgress(item.chain, 'darwinia', step, {
                        from: {
                            tx: item.tx,
                            chain: item.chain
                        },
                        to: {
                            tx: item.darwinia_tx,
                            chain: 'darwinia'
                        }
                    }, item.is_crosschain)}
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
                    <p>{t('No Cross-chain transfer history')}</p>
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
                        <p>{textTransform(parseChain('crab'), 'capitalize')} -> Darwinia MainNet</p>
                    </div>
                    <div>
                        <h3>{t('crosschain:Amount')}</h3>
                        <p>{formatBalance(Web3.utils.toBN(item.amount), 'gwei')} CRING -> {formatBalance(Web3.utils.toBN(item.amount).divn(100), 'gwei')} RING</p>
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
                    })}
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

    renderTransferProgress = (from, to, step, hash, hasRelay = false) => {
        const { t } = this.props
        return (
            <div className={styles.transferProgress}>
                <div className={styles.iconBox}>
                    <div><img src={stepStartIcon} alt="tx"></img></div>
                    <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 2, false)}${textTransform(from, 'capitalize')}Icon`]} alt="tx"></img></div>
                    { hasRelay ? <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 3, false)}RelayIcon`]} alt="tx"></img></div> : null}
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
                    { hasRelay ? <div className={`${this.renderProgress(step, 3)}`}>
                        <p>{t(`crosschain:ChainRelay Confirmed`)}</p>
                    </div> : null }
                    <div className={`${this.renderProgress(step, 4)}`}>
                        <p>{t('crosschain:Darwinia Confirmed')}</p>
                        { step >=4 && hash.to.tx ? <Button className={styles.hashBtn} variant="outline-purple" target="_blank" href={this.renderExplorerUrl(hash.to.tx, hash.to.chain)}>{t('crosschain:Txhash')}</Button> : null}
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
            darwinia: `https://darwinia-cc1.subscan.io/extrinsic/`,
        }

        let urlHash = _hash || txhash;
        if ((_networkType || networkType) === 'tron') {
            urlHash = remove0x(urlHash)
        }
        return `${domain[_networkType || networkType]}${urlHash}`
    }

    render() {
        const { status } = this.state
        return (
            <div>
                <div className={styles.claimBox}>
                    {status === 1 ? this.step1() : null}
                    {status === 2 || status === 3 ? this.step2() : null}
                    {status === 4 ? this.step4() : null}
                </div>
            </div>
        );
    }
}

export default withRouter(withTranslation()(Claims));
