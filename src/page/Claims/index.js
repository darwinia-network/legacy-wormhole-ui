import React, { Component } from "react";
import { Container, Button, Form } from 'react-bootstrap'

import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import dayjs from 'dayjs';
import Web3 from 'web3';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { connect, sign, formToast, getAirdropData, config, formatBalance, getClaimsInfo, getClaimsInfo1 } from './utils'
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
import promoteLogo from './img/promote-logo.png';
import promoteLogoEn from './img/promote-logo-en.png';
import helpLogo from './img/help-icon.png';
import labelTitleLogo from './img/label-title-logo.png';

class Claims extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            status: 1,
            networkType: 'eth',
            account: {
                eth: '',
                tron: ''
            },
            signature: '',
            darwiniaAddress: '',
            airdropNumber: Web3.utils.toBN(0),
            claimAmount: Web3.utils.toBN(0),
            claimTarget: '',
            hasFetched: false
        }
    }

    componentDidMount() {
        archorsComponent()
    }

    setValue = (key, event) => {
        this.setState({
            [key]: event.target.value
        })
        event.persist()
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
            }, () => {
                if (this.state.account[_networkType]) {
                    this.setState({
                        status: status
                    })
                    this.airdropData()
                    this.queryClaims()
                }
            })
        }, t);
    }

    sign = () => {
        const { networkType, account, darwiniaAddress } = this.state;
        const { t } = this.props;
        sign(networkType, account[networkType], darwiniaAddress, (signature) => {
            this.setState({
                signature: signature,
                status: 3
            })
        }, t)
    }

    onCopied = () => {
        const {t} = this.props
        formToast(t('page:Copied'))
    }

    toResult = () => {
        this.toClaims(4)
    }

    async queryClaims() {
        const { networkType, account } = this.state;
        const address = networkType === 'eth' ? account[networkType] : (window.tronWeb && window.tronWeb.address.toHex(account[networkType]))
        let json = await getClaimsInfo({
            query: { address: address },
            method: "post"
        });
        let json1 = await getClaimsInfo1({
            query: { address: address },
            method: "get"
        });
        if (json.code === 0) {
            
            if (json.data.info.length === 0) {
                json = {
                    data: {
                        info: [{
                            account: '',
                            target: '',
                            amount: '0'
                        }]
                    }
                }
            };
            
            this.setState({
                claimAmount: Web3.utils.toBN(json.data.info[0].amount),
                claimTarget: json.data.info[0].target,
                hasFetched: true,
            })
        } else {
        }
    }

    goBack = (status = 1) => {
        if(status === 1) {
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

    changeLng = lng => {
        const {i18n} = this.props;
        i18n.changeLanguage(i18n.language.indexOf('en') > -1 ? 'zh-cn' : 'en-us');
        localStorage.setItem("lng", lng);
    }

    renderHeader = () => {
        const { status } = this.state;
        const {t} = this.props
        return (
            <>
                {status === 1 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('page:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2close} />
                        <p>{t('page:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('page:step_3')}</p>
                    </div>
                </div> : null}
                {status === 2 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('page:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('page:step_2')}</p>
                    </div>
                    <div className={styles.dotsClose}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3close} />
                        <p>{t('page:step_3')}</p>
                    </div>
                </div> : null}
                {status === 3 ? <div className={styles.stepBox}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('page:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step2open} />
                        <p>{t('page:step_2')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('page:step_3')}</p>
                    </div>
                </div> : null}
                {status === 4 ? <div className={`${styles.stepBox} ${styles.stepResultBox}`}>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step1open} />
                        <p>{t('page:step_1')}</p>
                    </div>
                    <div className={styles.dotsOpen}></div>
                    <div className={styles.stepBoxItem}>
                        <img alt="" src={step3open} />
                        <p>{t('page:Result')}</p>
                    </div>
                </div> : null}
            </>
        )
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
                            <Form.Label>{t('page:Select Chain')}</Form.Label>
                            <Form.Control as="select" value={networkType}
                                onChange={(value) => this.setValue('networkType', value)}>
                                <option value="eth">Ethereum</option>
                                <option value="tron">Tron</option>
                            </Form.Control>

                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.toResult}>{t('page:search')}</Button>
                            <Button variant="gray" onClick={() => this.toClaims(2)}>{t('page:claim')}</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    step2 = () => {
        const { t } = this.props
        const { networkType, account, status, signature, darwiniaAddress, airdropNumber } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Snapshot data')}：</span></h1>
                        <p>{formatBalance(airdropNumber)} RING<br />({dayjs.unix(config.SNAPSHOT_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss ZZ')})
                        </p>

                        {status === 3 ? <>
                            <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Darwinia Crab Network account')}：</span></h1>
                            <p>{darwiniaAddress}</p>
                        </> : null}
                    </div>
                </div>

                {status === 2 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} claims-network-box`}>
                        <Form.Group controlId="darwinaAddressGroup">
                            <Form.Label>{t('page:Please enter the account of Darwinia Crab')} <a href={this.renderHelpUrl()} target="_blank"
                                rel="noopener noreferrer"><img alt=""
                                    className={styles.labelIcon} src={helpLogo} /></a> </Form.Label>
                            <Form.Control type="text" placeholder={t('page:Darwinia Crab Network account')} value={darwiniaAddress}
                                onChange={(value) => this.setValue('darwiniaAddress', value)} />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <Button variant="gray" onClick={this.sign}>{t('page:Submit')}</Button>
                            <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('page:Back')}</Button>
                        </div>
                    </div>
                </div> : null}

                {status === 3 ? <div className={styles.formBox}>
                    <div className={`${styles.networkBox} ${styles.signatureBox} claims-network-box`}>
                        <Form.Group controlId="signatureGroup">
                        <Form.Label>{t('page:Success! Please copy the signature below, and [claim] in Darwinia Wallet')}</Form.Label>
                            <Form.Control as="textarea" value={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                rows="3" />
                        </Form.Group>
                        <div className={styles.buttonBox}>
                            <CopyToClipboard text={JSON.stringify(JSON.parse(signature), undefined, 4)}
                                onCopy={() => this.onCopied()}>
                                <Button variant="gray">{t('page:Copy signature')}</Button>
                            </CopyToClipboard>
                        <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('page:Back')}</Button>
                        </div>
                    </div>
                </div> : null}
            </div>
        )
    }

    step4 = () => {
        const { t } = this.props
        const { networkType, account, airdropNumber, claimTarget, claimAmount, hasFetched } = this.state
        return (
            <div>
                {this.renderHeader()}
                <div className={styles.formBox}>
                    <div className={`${styles.connectInfoBox} claims-network-box`}>
                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Connected to')}：</span></h1>
                        <p>{account[networkType]}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Snapshot data')}：</span></h1>
                        <p>{claimAmount.eqn(0) ? formatBalance(airdropNumber) : formatBalance(claimAmount)} RING<br />({dayjs.unix(config.SNAPSHOT_TIMESTAMP).format('YYYY-MM-DD HH:mm:ss ZZ')})</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Destination')}：</span></h1>
                        <p>{claimTarget || '----'}</p>

                        <h1><img alt="" src={labelTitleLogo} /><span>{t('page:Claims Result')}：</span></h1>
                        <p>{hasFetched ? (claimTarget ? t('page:Claims') : t('page:Not claimed')) : '----'}</p>
                        <div className={styles.buttonBox}>
                        <Button variant="outline-gray" onClick={() => this.goBack(1)}>{t('page:Back')}</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    renderHelpUrl = () => {
        const lng = i18n.language.indexOf('en') > -1 ? 'en' : 'zh-CN'
        return `https://docs.darwinia.network/docs/${lng}/crab-tut-claim-cring`
    }

    render() {
        const { t } = this.props
        const { status } = this.state
        return (
            <div className={styles.claimBox}>
                {status === 1 ? this.step1() : null}
                {status === 2 || status === 3 ? this.step2() : null}
                {status === 4 ? this.step4() : null}
            </div>
        );
    }
}

export default withTranslation()(Claims);
