import React, { useState, useEffect } from "react";
import { ListGroup, Spinner, Modal, Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Web3 from "web3";
import "./erc20TokenComponent.scss";
import {
    config,
    formatBalance,
    toShortAccount,
} from "../../page/CrossChain/utils";
import {
    confirmRegister,
    getAllTokens,
    getTokenRegisterStatus,
    proofObservable,
    registerToken,
} from "../../page/CrossChain/erc20/token";
import {
    getNameAndLogo,
    getSymbolAndDecimals,
    getTokenName,
} from "../../page/CrossChain/erc20/token-util";
import JazzIcon from "../jazzIcon/JazzIconComponent";
import { getMetamaskActiveAccount } from "../../page/CrossChain/utils";
import { useCancelablePromise } from "../../hooks/cancelablePromise";

export default function Erc20Token(props) {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [tipMsg, setTipMsg] = useState(
        t(
            "Tips After submit the registration, please wait for the {{type}} network to return the result, click [Upcoming] to view the progress.",
            { type: config.NETWORK_NAME }
        )
    );
    const facade = [
        {
            title: t("crosschain:Select a token"),
            icon: null,
            content: <SearchToken onSelect={props.onHide} />,
            footer: (
                <Button
                    onClick={() => {
                        setStep(1);
                    }}
                    variant="link"
                >
                    {"💻 "}
                    {t("common:Manage")}
                </Button>
            ),
        },
        {
            title: t("common:Manage"),
            icon: (
                <span
                    className="back"
                    onClick={() => {
                        if (step > 0) {
                            setStep(step - 1);
                        }
                    }}
                >
                    ⬅
                </span>
            ),
            content: (
                <Manager
                    onTabChange={(index) => {
                        const messages = [
                            "Tips After submit the registration, please wait for the {{type}} network to return the result, click [Upcoming] to view the progress.",
                            "Tips After {{type}} network returns the result, click [Confirm] to complete the token registration.",
                        ];

                        setTipMsg(
                            t(messages[index], {
                                type: config.NETWORK_NAME,
                            })
                        );
                    }}
                />
            ),
            footer: <p className="tip">{t(tipMsg, { type: "" })}</p>,
        },
    ];

    return (
        <Modal
            {...props}
            onHide={() => {
                props.onHide();
                setStep(0);
            }}
            backdrop="static"
            className="erc20-token-select"
        >
            <Modal.Header closeButton>
                {facade[step].icon}
                <Modal.Title>{facade[step].title}</Modal.Title>
            </Modal.Header>

            <Modal.Body>{facade[step].content}</Modal.Body>

            <Modal.Footer>{facade[step].footer}</Modal.Footer>
        </Modal>
    );
}

function ListItem(props) {
    const { token } = props;
    const { address, logo, source, name, symbol } = token;

    return (
        <ListGroup.Item key={address} onClick={() => props?.onSelect(token)}>
            <div>
                {!!token.logo ? (
                    <img src={`/images/${logo}`} alt="" />
                ) : (
                    <JazzIcon address={source || address}></JazzIcon>
                )}
                <div>
                    <h6>{getTokenName(name, symbol)}</h6>
                    <p>{toShortAccount(address)}</p>
                </div>
            </div>

            {props.children}
        </ListGroup.Item>
    );
}

/**
 * @param { onSelect?: token => void; isUpcoming: boolean; tokens: any[] }
 */
function SearchToken(props) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [allTokens, setAllTokens] = useState([]);
    const [display, setDisplay] = useState([]);
    const [currentAccount, setCurrentAccount] = useState("");
    const makeCancelable = useCancelablePromise();

    useEffect(() => {
        (async () => {
            const account = await makeCancelable(getMetamaskActiveAccount());

            setCurrentAccount(account);
        })();

        window.ethereum.on("accountsChanged", (accounts) => {
            setCurrentAccount(accounts[0]);
            setAllTokens([]);
            setDisplay([]);
        });
    }, [makeCancelable]);

    useEffect(() => {
        (async () => {
            setLoading(true);

            try {
                const all = await makeCancelable(getAllTokens(currentAccount));

                setAllTokens(all);
                setDisplay(all);
            } catch (error) {
                console.error(error);
            }

            setLoading(false);
        })();
    }, [currentAccount, makeCancelable]);

    return (
        <>
            <Form>
                <Form.Group controlId="address">
                    <Form.Control
                        type="text"
                        required
                        placeholder={t(
                            "crosschain:Search name or paste address"
                        )}
                        onChange={(event) => {
                            const value = event.target.value;

                            if (!value) {
                                setDisplay(allTokens);
                            }

                            const isAddress = Web3.utils.isAddress(value);

                            if (isAddress) {
                                setDisplay(
                                    allTokens.filter(
                                        (token) => token.address === value
                                    )
                                );
                            } else {
                                setDisplay(
                                    allTokens.filter((token) =>
                                        token.symbol
                                            .toLowerCase()
                                            .includes(value.toLowerCase())
                                    )
                                );
                            }
                        }}
                    />
                </Form.Group>
            </Form>

            {loading ? (
                <Spinner
                    animation="border"
                    role="status"
                    className="spinner"
                ></Spinner>
            ) : (
                <ListGroup className="token-list">
                    {display.map((token) => {
                        const { balance } = token;

                        return (
                            <ListItem
                                key={token.address}
                                token={token}
                                onSelect={props?.onSelect}
                            >
                                <span>{formatBalance(balance)}</span>
                            </ListItem>
                        );
                    })}
                </ListGroup>
            )}
        </>
    );
}

function Manager(props) {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [isRegisteredTokenInvalid, setIsRegisteredTokenInvalid] = useState(
        false
    );
    const [registeredStatus, setRegisteredStatus] = useState(-1);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [assets, setAssets] = useState([]);
    const [display, setDisplay] = useState([]);
    const makeCancelable = useCancelablePromise();
    const onTabClick = (index) => {
        return (event) => {
            if (props.onTabChange) {
                props.onTabChange(index);
            }

            setActive(index);
        };
    };

    useEffect(() => {
        const subscription = proofObservable.subscribe((proof) => {
            // TODO: find the target assets , update its status to wait confirm.
            const { address } = proof;
            const index = assets.findIndex(
                (asset) => asset.address === address
            );
            if (index > 0) {
                assets[index].proof = proof;
            }

            setAssets([...assets]);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [assets]);

    useEffect(() => {
        if (active !== 0 || isRegisteredTokenInvalid || !inputValue) {
            setRegisteredStatus(-1);
            return;
        }

        (async () => {
            setIsLoading(true);

            const status = await makeCancelable(getTokenRegisterStatus(inputValue));
            const result = await makeCancelable(getSymbolAndDecimals(inputValue));
            const { name, value } = getNameAndLogo(inputValue);

            setRegisteredStatus(status);
            setToken({ ...result, name, value, address: inputValue });
            setIsLoading(false);
        })();
    }, [inputValue, active, isRegisteredTokenInvalid, makeCancelable]);

    return (
        <>
            <div className="tab-container">
                <span
                    className={`tab ${active === 0 ? "active" : ""}`}
                    onClick={onTabClick(0)}
                >
                    {t("crosschain:Register")}
                </span>
                <span
                    className={`tab ${active === 1 ? "active" : ""}`}
                    onClick={onTabClick(1)}
                >
                    {t("crosschain:Upcoming")}
                </span>
            </div>

            {active === 0 && (
                <>
                    <Form className="register-control">
                        <Form.Group controlId="address">
                            <Form.Label>
                                {t("crosschain:Token Contract Address")}
                            </Form.Label>
                            <Form.Control
                                type="text"
                                isInvalid={isRegisteredTokenInvalid}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    setInputValue(value);

                                    if (!value) {
                                        setIsRegisteredTokenInvalid(false);
                                        return;
                                    }

                                    const isAddress = Web3.utils.isAddress(
                                        value
                                    );

                                    setIsRegisteredTokenInvalid(!isAddress);
                                }}
                            />
                            <Form.Control.Feedback type="invalid">
                                {t("common:Invalid Address")}
                            </Form.Control.Feedback>

                            {registeredStatus === 1 && (
                                <Form.Text>
                                    {t(
                                        "crosschain:This token has been registered."
                                    )}
                                </Form.Text>
                            )}

                            {registeredStatus === 2 && (
                                <Form.Text>
                                    {t(
                                        "crosschain:This token has been registered, switch to upcoming tab to view the register status."
                                    )}
                                </Form.Text>
                            )}
                        </Form.Group>
                    </Form>

                    {isLoading ? (
                        <Spinner
                            animation="border"
                            role="status"
                            className="spinner"
                        ></Spinner>
                    ) : (
                        <div
                            className="token-info"
                            style={{
                                display:
                                    isRegisteredTokenInvalid || !inputValue
                                        ? "none"
                                        : "block",
                            }}
                        >
                            <h6>{t("Token Info")}</h6>

                            <div className="info">
                                <b>{t("Symbol")}</b>
                                <span>{token?.symbol}</span>
                            </div>

                            <div className="info">
                                <b>{t("Decimals of Precision")}</b>
                                <span>{token?.decimals}</span>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="secondary"
                        disabled={
                            isRegisteredTokenInvalid ||
                            isLoading ||
                            registeredStatus !== 0
                        }
                        className="submit-btn"
                        onClick={() => {
                            setAssets([token, ...assets]);
                            registerToken(inputValue);
                        }}
                    >
                        {t("common:Submit")}
                    </Button>
                </>
            )}

            {active === 1 && (
                <>
                    <Form className="register-control">
                        <Form.Group controlId="address">
                            <Form.Control
                                type="text"
                                required
                                placeholder={t(
                                    "crosschain:Search name or paste address"
                                )}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    if (!value) {
                                        setDisplay(assets);
                                    }

                                    const isAddress = Web3.utils.isAddress(
                                        value
                                    );

                                    if (isAddress) {
                                        setDisplay(
                                            assets.filter(
                                                (token) =>
                                                    token.address === value
                                            )
                                        );
                                    } else {
                                        setDisplay(
                                            assets.filter((token) =>
                                                token.symbol
                                                    .toLowerCase()
                                                    .includes(
                                                        value.toLowerCase()
                                                    )
                                            )
                                        );
                                    }
                                }}
                            />
                        </Form.Group>
                    </Form>
                    <ListGroup className="token-list">
                        {!display.length && <EmptyData />}
                        {display?.map((token, index) => {
                            const { proof } = token;

                            return (
                                <ListItem
                                    key={token.address}
                                    token={token}
                                    onClick={props.onSelect}
                                >
                                    {token.proof ? (
                                        token.confirm ? (
                                            <span>✔</span>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    confirmRegister(proof).then(
                                                        () => {
                                                            token.confirm = true;
                                                        }
                                                    )
                                                }
                                            >
                                                {t("Confirm")}
                                            </Button>
                                        )
                                    ) : (
                                        <Spinner
                                            animation="border"
                                            size="sm"
                                            variant="danger"
                                        />
                                    )}
                                </ListItem>
                            );
                        })}
                    </ListGroup>
                </>
            )}
        </>
    );
}

export function EmptyData() {
    const { t } = useTranslation();

    return <div className="empty">{t("Empty data")}</div>;
}
