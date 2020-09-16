import React, { Component } from "react";
import { Button, Form, Spinner } from 'react-bootstrap'
import { withRouter } from 'react-router-dom';

import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import { encodeAddress } from '@polkadot/util-crypto';

import { connect, sign, formToast, getAirdropData, config, formatBalance, getBuildInGenesisInfo, getTokenBalance, buildInGenesis, textTransform, remove0x } from './utils'
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
import helpSmall from './img/help-s.png';

import stepStartIcon from './img/tx-step-start-icon.svg';
import stepEthereumIcon from './img/tx-step-ethereum-icon.svg';
import stepTronIcon from './img/tx-step-tron-icon.svg';
import stepDarwiniaIcon from './img/tx-step-darwinia-icon.svg';
import stepInactiveEthereumIcon from './img/tx-step-ethereum-inactive-icon.svg';
import stepInactiveTronIcon from './img/tx-step-ethereum-inactive-icon.svg';
import stepInactiveDarwiniaIcon from './img/tx-step-darwinia-inactive-icon.svg';

import chainMap from './chain';

const txProgressIcon = {
    stepStartIcon,
    stepEthereumIcon,
    stepDarwiniaIcon,
    stepInactiveEthereumIcon,
    stepInactiveDarwiniaIcon,
    stepTronIcon,
    stepInactiveTronIcon
}

class Claims extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            status: 1,
            networkType: 'eth',
            tokenType: 'ring',
            account: {
                eth: '',
                tron: ''
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
            history: null
        }
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
    }

    setValue = (key, event, fn, cb) => {
        this.setState({
            [key]: fn ? fn(event.target.value) : event.target.value
        })
        cb && cb(event.target.value)
        event.persist()
    }

    setBNValue = (value) => {
        this.setState({
            crossChainBalanceText: value
        })
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

    toClaims = (status = 2) => {
        const { networkType, account } = this.state;
        const { t } = this.props;
        connect(networkType, (_networkType, _account) => {
            this.setState({
                account: {
                    ...account,
                    [_networkType]: _account
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
                    this.setState({
                        ringBalance: Web3.utils.toBN(balances[0]),
                        ktonBalance: Web3.utils.toBN(balances[1])
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

        if (!this.checkForm()) return;
        buildInGenesis(networkType, account[networkType], {
            to: darwiniaAddress,
            value: crossChainBalance,
            tokenType
        }, (hash) => {
            console.log(11111, hash)
            this.setState({
                txhash: hash,
                status: 3
            })
        }, t)
    }

    checkForm = () => {
        const { crossChainBalance, crossChainBalanceText, ringBalance, ktonBalance, tokenType } = this.state;
        const balance = {
            ringBalance,
            ktonBalance
        }
        const { t } = this.props;
        try {
            Web3.utils.toBN(Web3.utils.toWei(crossChainBalanceText, 'ether'))
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
        const address = networkType === 'eth' ? account[networkType] : (window.tronWeb && window.tronWeb.address.toHex(account[networkType]))
        let json = await getBuildInGenesisInfo({
            query: { address: address },
            method: "get"
        });
        if (json.code === 0) {
            if (json.data.length === 0) {
                json = {
                    data: []
                }
            };

            this.setState({
                history: json.data
            })
        } else {
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
                            </Form.Control>
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="outline-purple" onClick={this.toResult}>{t('crosschain:search')}</Button>
                            <Button variant="outline-purple" onClick={() => this.toClaims(2)}>{t('crosschain:claim')}</Button>
                        </div>
                    </div>
                </div>
                <div className={styles.formBox}>
                    <div className={styles.stepRoadMap}>
                        <h3>{t('crosschain:Roadmap for cross-chain transfers')}</h3>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>{t('crosschain:Phase 1')}</p>
                            <p>{t('crosschain:In progress')}</p>
                            </div>
                            <p>{t('crosschain:The cross-chain transfers at this stage will arrive after launching the Darwinia mainnet and will be sent to the destination account by Genesis Block')}</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>{t('crosschain:Phase 2')}</p>
                                <p>2020 Q3</p>
                            </div>
                            <p>{t('crosschain:Cross-chain transfers at this stage will arrive immediately (network delays may occur),but only support One-way transfers to the Darwinia main network')}</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>{t('crosschain:Phase 3')}</p>
                                <p>2020 Q3 - Q4</p>
                            </div>
                            <p>{t('crosschain:Cross-chain transfers at this stage will arrive immediately (network delays may occur), and support two-way or multi-way transfers')}</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    step2 = () => {
        const { t } = this.props
        const { networkType, account, status, signature, darwiniaAddress, ringBalance, ktonBalance, tokenType, crossChainBalanceText, crossChainBalance } = this.state
        const explorerUrl = this.renderExplorerUrl()
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>

                        {status === 3 ? <>
                            <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Darwinia Network account')}：</span></h1>
                            <p>{darwiniaAddress}</p>
                            <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Amount')}：</span></h1>
                            <p>{`${formatBalance(crossChainBalance, 'ether')} ${tokenType.toUpperCase()}`}</p>
                        </> : null}
                    </div>
                </div>

                {status === 2 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="darwinaAddressGroup">
                            <Form.Label>{t('crosschain:Please enter the destination account of Darwinia mainnet')} <a href={this.renderHelpUrl()} target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder={t('crosschain:Darwinia Network account')} value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value)} />
                            <Form.Text className="text-muted">
                                {t('crosschain:Please be sure to fill in the real Darwinia mainnet account, and keep the account recovery files such as mnemonic properly.')}
                            </Form.Text>

                            <Form.Label>{t('crosschain:Cross-chain transfer token')}</Form.Label>
                            <Form.Control as="select" value={tokenType}
                                onChange={(value) => this.setValue('tokenType', value)}>
                                <option value="ring">RING({t('crosschain:MAX')} {formatBalance(ringBalance, 'ether')})</option>
                                <option value="kton">KTON({t('crosschain:MAX')} {formatBalance(ktonBalance, 'ether')})</option>
                            </Form.Control>

                            <Form.Label>{t('crosschain:Amount')}</Form.Label>
                            <Form.Control type="number" placeholder={t('crosschain:Amount')} value={crossChainBalanceText}
                                onChange={(value) => this.setValue('crossChainBalance', value, this.toWeiBNMiddleware, this.setBNValue)} />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="color" onClick={this.buildInGenesis}>{t('crosschain:Submit')}</Button>
                            <Button variant="outline-purple" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                        </div>
                    </div>
                </div> : null}

                {status === 3 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} ${styles.hashBox} claims-network-box`}>
                        <Form.Group controlId="signatureGroup">
                            <Form.Label>{t('crosschain:Confirmed！After Darwinia mainnet launched, you will receive this cross-chain transfer.')}</Form.Label>
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
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectAccountBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>
                    </div>
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
                        return (<div className={styles.historyItem} key={item.tx}>
                            <div>
                                <h3>{t('crosschain:Time')}</h3>
                                <p>{dayjs.unix(item.block_timestamp).format('YYYY-MM-DD HH:mm:ss ZZ')}</p>
                            </div>
                            <div>
                                <h3>{t('crosschain:Cross-chain direction')}</h3>
                                <p>{textTransform(parseChain(item.chain), 'capitalize')} -> Darwinia MainNet</p>
                            </div>
                            <div>
                                <h3>{t('crosschain:Amount')}</h3>
                                <p>{formatBalance(Web3.utils.toBN(item.amount), 'ether')} {item.currency.toUpperCase()}</p>
                            </div>
                            <div>
                                <h3>{t('crosschain:Destination account')}</h3>
                                <p>{encodeAddress('0x' + item.target, 18)}</p>
                            </div>
                            <div className={styles.line}></div>
                            {this.renderTransferProgress(parseChain(item.chain), 'darwinia', 2, {
                                from: {
                                    tx: item.tx,
                                    chain: item.chain
                                }
                            })}
                        </div>)
                    }) : null}
                    <div className={styles.buttonBox}>
                        <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('crosschain:Back')}</Button>
                    </div>

                </div>
            </div>
        )
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

    renderTransferProgress = (from, to, step, hash) => {
        const { t } = this.props
        return (
            <div className={styles.transferProgress}>
                <div className={styles.iconBox}>
                    <div><img src={stepStartIcon} alt="tx"></img></div>
                    <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 2, false)}${textTransform(from, 'capitalize')}Icon`]} alt="tx"></img></div>
                    <div className={`${this.renderProgress(step, 3)}`}><img src={txProgressIcon[`step${this.renderProgress(step, 3, false)}${textTransform(to, 'capitalize')}Icon`]} alt="tx"></img></div>
                </div>
                <div className={styles.titleBox}>
                    <div>
                        <p>{t('crosschain:Transaction Send')}</p>
                    </div>
                    <div className={`${this.renderProgress(step, 2)}`}>
                        <p>{t(`crosschain:${textTransform(from, 'capitalize')} Confirmed`)}</p>
                        <Button className={styles.hashBtn} variant="outline-purple" target="_blank" href={this.renderExplorerUrl(hash.from.tx, hash.from.chain)}>{t('crosschain:Txhash')}</Button>
                    </div>
                    <div className={`${this.renderProgress(step, 3)}`}>
                        <p>{t('crosschain:Darwinia Confirmed')}</p>
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
            tron: `${config.TRONSCAN_DOMAIN}/#transaction/`
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
