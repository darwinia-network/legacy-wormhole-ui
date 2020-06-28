import React, { Component } from "react";
import { Container, Button, Form } from 'react-bootstrap'

import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import { encodeAddress } from '@polkadot/util-crypto';
import _ from 'lodash';

import { connect, sign, formToast, getAirdropData, config, formatBalance, getBuildInGenesisInfo, getTokenBalance, buildInGenesis } from './utils'
import archorsComponent from '../../components/anchorsComponent'
import { withTranslation } from "react-i18next";
import i18n from '../../locales/i18n';

import styles from "./style.module.scss";
import darwiniaLogo from './img/darwinia-logo.png';
import step1open from './img/step-1-open.png';
import step2open from './img/step-2-open.png';
import step2close from './img/step-2-close.png';
import step3open from './img/step-3-open.png';
import step3close from './img/step-3-close.png';
import helpLogo from './img/help-icon.png';
import labelTitleLogo from './img/label-title-logo.png';
import helpSmall from './img/help-s.png';

import chainMap from './chain';
import check from "@polkadot/util-crypto/address/check";

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
            history: []
        }
    }

    componentDidMount() {
        archorsComponent()
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
            this.setState({
                hash: hash,
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
        const { t } = this.props
        const { networkType } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="networkSelectGroup">
                            <Form.Label>{t('crosschain:Select Chain')}</Form.Label>
                            <Form.Control as="select" value={networkType}
                                onChange={(value) => this.setValue('networkType', value)}>
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
                        <h3>{t('跨链转账路线图：')}<a target="_blank" rel="noopener noreferrer" href="https://darwinia.network">
                            <img src={helpSmall} alt="help" />
                        </a></h3>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段1: 创世跨链</p>
                                <p>2020.05.30 - 2020.06.30</p>
                            </div>
                            <p>此阶段的跨链转账，将在 Darwinia 主网上线后到账，通过 Genesis Block 发至指定账号</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段2: 单向跨链</p>
                                <p>2020 Q3</p>
                            </div>
                            <p>此阶段的跨链转账，立即到账（可能存在一定的网络延迟），但仅支持发至Darwinia 主网的单项转账</p>
                        </div>
                        <div className={styles.stepRoadMapItem}>
                            <div>
                                <p>阶段3: 多向跨链</p>
                                <p>2020 Q3 - Q4</p>
                            </div>
                            <p>此阶段的跨链转账，立即到账（可能存在一定的网络延迟），且支持双向或多向转账</p>
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
                            <Form.Label>{t('crosschain:Please enter the account of Darwinia Network')} <a href={this.renderHelpUrl()} target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder={t('crosschain:Darwinia Network account')} value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value)} />
                            <Form.Text className="text-muted">
                                请务必填写真实的 Darwinia 主网账号，并妥善保管助记词等账号恢复文件。
                            </Form.Text>

                            <Form.Label>映射通证</Form.Label>
                            <Form.Control as="select" value={tokenType}
                                onChange={(value) => this.setValue('tokenType', value)}>
                                <option value="ring">RING(MAX {formatBalance(ringBalance, 'ether')})</option>
                                <option value="kton">KTON(MAX {formatBalance(ktonBalance, 'ether')})</option>
                            </Form.Control>

                            <Form.Label>映射数量</Form.Label>
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
                            <Form.Label>{t('crosschain:The transaction was successfully sent! After the Darwinia mainnet is launched, the successfully mapped RING at this stage will be sent to the designated account.')}</Form.Label>
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
        const { networkType, account, airdropNumber, claimTarget, claimAmount, hasFetched, history } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectAccountBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('crosschain:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>
                    </div>

                    {history.map((item) => {

                        return (<div className={styles.historyItem}>
                            <div>
                                <h3>时间</h3>
                                <p>{dayjs.unix(item.block_timestamp).format('YYYY-MM-DD HH:mm:ss ZZ')}</p>
                            </div>
                            <div>
                                <h3>跨链流向</h3>
                                <p>{item.chain} -> Darwinia MainNet</p>
                            </div>
                            <div>
                                <h3>数量</h3>
                                <p>{formatBalance(Web3.utils.toBN(item.amount), 'ether')} {item.currency.toUpperCase()}</p>
                            </div>
                            <div>
                                <h3>接收账号</h3>
                                <p>{encodeAddress('0x' + item.target, 18)}</p>
                            </div>
                            <Button variant="outline-purple" block href={this.renderExplorerUrl(item.tx, item.chain)}>{t('crosschain:Txhash')}</Button>
                        </div>)
                    })}
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
        return `https://docs.darwinia.network/docs/${lng}/crab-tut-claim-cring`
    }

    renderExplorerUrl = (_hash, _networkType) => {
        const lng = i18n.language.indexOf('en') > -1 ? 'en' : 'zh'
        const { hash, networkType } = this.state
        const domain = {
            eth: `${config.ETHERSCAN_DOMAIN[lng]}/tx/`,
            tron: `${config.TRONSCAN_DOMAIN}/#transaction/`
        }

        return `${domain[_networkType || networkType]}${_hash || hash}`
    }

    render() {
        const { t } = this.props
        const { status, from, to } = this.state
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

export default withTranslation()(Claims);
