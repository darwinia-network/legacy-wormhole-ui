import { encodeAddress } from "@polkadot/util-crypto";
import dayjs from "dayjs";
import React from "react";
import { Button, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Web3 from "web3";
import stepStartIcon from "../../page/CrossChain/img/tx-step-start-icon.svg";
import {
    formatBalance,
    textTransform,
    remove0x,
    config,
} from "../../page/CrossChain/utils";
import { parseChain } from "../../util";
import EmptyData from "../empty/emptyData";
import styles from "./historyRecord.scss";
import "./historyRecord.scss";
import { txProgressIcon } from "../../page/CrossChain/icons";
import i18n from "../../locales/i18n";

export default function HistoryRecord({ history }) {
    const { t } = useTranslation();

    if (!history) {
        return (
            <div className="d-flex flex-wrap justify-content-center pb-4">
                <Spinner animation="border" />
            </div>
        );
    }

    if (!!history && !history.length) {
        return (
            <EmptyData
                className="history-empty"
                text="crosschain:No Cross-chain transfer history"
            />
        );
    }

    return (
        <>
            {history.map((item) => {
                let step = 2;
                const isDeposit = item.currency?.toUpperCase() === "DEPOSIT";
                let depositInfo = JSON.parse(item.deposit || "{}");

                if (item.is_crosschain) {
                    if (item.is_relayed) {
                        step = 3;
                    }
                    if (item.is_relayed && item.darwinia_tx !== "") {
                        step = 4;
                    }
                } else {
                    step = 4;
                }

                return (
                    <div className="history-item" key={item.block_hash || item.tx || item.block_timestamp}>
                        <div>
                            <h3>{t("crosschain:Time")}</h3>
                            <p>
                                {dayjs
                                    .unix(item.block_timestamp)
                                    .format("YYYY-MM-DD HH:mm:ss ZZ")}
                            </p>
                        </div>

                        <div>
                            <h3>{t("crosschain:Cross-chain direction")}</h3>
                            <p>
                                {textTransform(
                                    parseChain(item.chain),
                                    "capitalize"
                                )}{" "}
                                -&gt; Darwinia MainNet
                            </p>
                        </div>

                        {isDeposit ? (
                            <>
                                <div>
                                    <h3>{t("crosschain:Asset")}</h3>
                                    <p>
                                        {t("crosschain:Deposit ID")}:{" "}
                                        {depositInfo.deposit_id}
                                    </p>
                                </div>

                                <div>
                                    <h3>{t("crosschain:Detail")}</h3>
                                    <DepositHistoryDetail
                                        amount={item.amount}
                                        deposit={depositInfo}
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <h3>{t("crosschain:Amount")}</h3>
                                <p>
                                    {formatBalance(
                                        Web3.utils.toBN(item.amount),
                                        "ether"
                                    )}{" "}
                                    {item.currency?.toUpperCase()}
                                </p>
                            </div>
                        )}

                        <div>
                            <h3>{t("crosschain:Destination account")}</h3>
                            <p>{item.target?.startsWith('0x') ? item.target : encodeAddress("0x" + item.target, 18)}</p>
                        </div>

                        <div className="line"></div>

                        <TransferProgress
                            from={item.chain}
                            to="darwinia"
                            step={step}
                            hash={{
                                from: {
                                    tx: item.tx,
                                    chain: item.chain,
                                },
                                to: {
                                    tx: item.darwinia_tx,
                                    chain: "darwinia",
                                },
                            }}
                            hasRelay={item.is_crosschain}
                        />
                    </div>
                );
            })}
        </>
    );
}

function DepositHistoryDetail({ amount, deposit }) {
    const { t } = useTranslation();

    if (!deposit) {
        return null;
    }

    const depositStartTime = dayjs.unix(deposit.start);
    const depositEndTime = depositStartTime.add(30 * deposit.month, "day");

    return (
        <p>
            {formatBalance(Web3.utils.toBN(amount), "ether")} RING (
            {t("crosschain:Time")}: {depositStartTime.format("YYYY/MM/DD")} -{" "}
            {depositEndTime.format("YYYY/MM/DD")})
        </p>
    );
}

function getProgress(current, threshold, isStyle = true) {
    const className = current >= threshold ? "" : "inactive";

    return isStyle ? styles[className] : textTransform(className, 'capitalize');
}

function getExplorerUrl(hash, networkType) {
    const lng = i18n.language.indexOf("en") > -1 ? "en" : "zh";
    const domain = {
        eth: `${config.ETHERSCAN_DOMAIN[lng]}/tx/`,
        tron: `${config.TRONSCAN_DOMAIN}/#transaction/`,
        crab: `https://crab.subscan.io/extrinsic/`,
        pangolin: `https://pangolin.subscan.io/extrinsic/`,
        darwinia: `${config.SUBSCAN_DARWINIA_DOMAIN}/extrinsic/`,
    };
    let urlHash = hash;

    if (networkType === "tron") {
        urlHash = remove0x(urlHash);
    }

    return `${domain[networkType]}${urlHash}`;
}

function TransferProgress({
    from,
    to,
    step,
    hash,
    hasRelay = false,
    relayButton = null,
}) {
    const RelayButton = relayButton && relayButton();
    const { t } = useTranslation();

    return (
        <div className="transfer-progress">
            <div className="icon-box">
                <div>
                    <img src={stepStartIcon} alt="tx"></img>
                </div>
                <div className={`${getProgress(step, 3)}`}>
                    <img
                        src={
                            txProgressIcon[
                                `step${getProgress(
                                    step,
                                    2,
                                    false
                                )}${textTransform(from, "capitalize")}Icon`
                            ]
                        }
                        alt="tx"
                    ></img>
                </div>
                {hasRelay ? (
                    <div className={`${getProgress(step, 3)}`}>
                        <img
                            src={
                                txProgressIcon[
                                    `step${getProgress(
                                        step,
                                        3,
                                        false
                                    )}RelayIcon`
                                ]
                            }
                            alt="tx"
                        ></img>
                    </div>
                ) : null}
                <div className={`${getProgress(step, 4)}`}>
                    <img
                        src={
                            txProgressIcon[
                                `step${getProgress(
                                    step,
                                    4,
                                    false
                                )}${textTransform(to, "capitalize")}Icon`
                            ]
                        }
                        alt="tx"
                    ></img>
                </div>
            </div>
            <div className="title-box">
                <div>
                    <p>{t("crosschain:Transaction Send")}</p>
                </div>
                <div className={`${getProgress(step, 2)}`}>
                    <p>
                        {t(
                            `crosschain:${textTransform(
                                parseChain(from),
                                "capitalize"
                            )} Confirmed`
                        )}
                    </p>
                    <Button
                        className="hash-btn"
                        variant="outline-purple"
                        target="_blank"
                        href={getExplorerUrl(hash.from.tx, hash.from.chain)}
                    >
                        {t("crosschain:Txhash")}
                    </Button>
                </div>
                {hasRelay ? (
                    <div className={`${getProgress(step, 3)}`}>
                        <p>{t(`crosschain:ChainRelay Confirmed`)}</p>
                        {RelayButton ? RelayButton : null}
                    </div>
                ) : null}
                <div className={`${getProgress(step, 4)}`}>
                    <p>
                        {t(
                            `crosschain:${textTransform(
                                parseChain(to),
                                "capitalize"
                            )} Confirmed`
                        )}
                    </p>
                    {step >= 4 && hash.to && hash.to.tx ? (
                        <Button
                            className="hash-btn"
                            variant="outline-purple"
                            target="_blank"
                            href={getExplorerUrl(hash.to.tx, hash.to.chain)}
                        >
                            {t("crosschain:Txhash")}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
