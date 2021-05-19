import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import Web3 from "web3";
import {
    useAllTokens,
    useCancelablePromise,
    useLocalSearch,
} from "../../hooks";
import {
    confirmRegister,
    getTokenRegisterStatus,
    popupRegisterProof,
    proofObservable,
    registerToken,
} from "../../page/CrossChain/erc20/token";
import {
    getNameAndLogo,
    getSymbolAndDecimals,
    getTokenName,
} from "../../page/CrossChain/erc20/token-util";
import {
    config,
    connectNodeProvider,
    formatBalance,
    toShortAccount,
} from "../../page/CrossChain/utils";
import EmptyData from "../empty/emptyData";
import JazzIcon from "../jazzIcon/JazzIconComponent";
import "./erc20TokenComponent.scss";

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
            content: (
                <SearchToken
                    onSelect={props.onHide}
                    networkType={props.networkType}
                />
            ),
            footer: (
                <Button
                    onClick={() => {
                        setStep(1);
                    }}
                    variant="link"
                    className="manager"
                >
                    <i className="bi bi-pencil-square"></i>
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
                    <i className="bi bi-arrow-left"></i>
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
    const { networkType, ...modalProps } = props;

    useEffect(() => {
        connectNodeProvider(config.DARWINIA_ETHEREUM_FROM_WSS);
    }, []);

    return (
        <Modal
            {...modalProps}
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

            {networkType === "eth" ? (
                <Modal.Footer>{facade[step].footer}</Modal.Footer>
            ) : null}
        </Modal>
    );
}

function ListItem(props) {
    const { token } = props;
    const { address, logo, source, name, symbol } = token;

    return (
        <ListGroup.Item
            disabled={props.disabled}
            key={address}
            onClick={() => props?.onSelect(token)}
        >
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

const tokenSearchFactory = (tokens) => (value) => {
    if (!value) {
        return tokens;
    }

    const isAddress = Web3.utils.isAddress(value);

    return isAddress
        ? tokens.filter((token) => token.address === value)
        : tokens.filter((token) =>
              token.symbol.toLowerCase().includes(value.toLowerCase())
          );
};

/**
 * @param { onSelect?: token => void; isUpcoming: boolean; tokens: any[] }
 */
function SearchToken(props) {
    const { t } = useTranslation();
    const { loading, allTokens } = useAllTokens(props.networkType);
    const searchFn = useCallback(tokenSearchFactory(allTokens), [allTokens]);
    const { data, setSearch } = useLocalSearch(searchFn);

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

                            setSearch(value);
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
                    {data.map((token) => (
                        <ListItem
                            key={token.address}
                            token={token}
                            onSelect={props?.onSelect}
                            display={token.status === 2}
                        >
                            {token.status === 1 ? (
                                <span>
                                    {formatBalance(token.balance, "ether")}
                                </span>
                            ) : (
                                <span className="circle-ring" />
                            )}
                        </ListItem>
                    ))}
                </ListGroup>
            )}
        </>
    );
}

function Manager(props) {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const [isRegisteredTokenInvalid, setIsRegisteredTokenInvalid] =
        useState(false);
    const [registeredStatus, setRegisteredStatus] = useState(-1);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const makeCancelable = useCancelablePromise();
    const { loading, allTokens, setAllTokens } = useAllTokens(
        props.networkType,
        2
    );
    const searchFn = useCallback(tokenSearchFactory(allTokens), [allTokens]);
    const { data, setSearch } = useLocalSearch(searchFn);
    const onTabClick = (index) => {
        return () => {
            if (props.onTabChange) {
                props.onTabChange(index);
            }

            setActive(index);
        };
    };

    useEffect(() => {
        const subscription = proofObservable.subscribe((proof) => {
            const updated = allTokens.map((token) =>
                proof.source === token.address ? { ...token, proof } : token
            );

            setAllTokens(updated);
        });

        return () => subscription.unsubscribe();
    }, [allTokens, setAllTokens]);

    useEffect(() => {
        const subscriptions = allTokens.map(({ address }) =>
            popupRegisterProof(address)
        );

        return () => {
            subscriptions.forEach((sub) => sub.unsubscribe());
        };
    }, [allTokens]);

    useEffect(() => {
        if (active !== 0 || isRegisteredTokenInvalid || !inputValue) {
            setRegisteredStatus(-1);
            return;
        }

        (async () => {
            setIsLoading(true);

            const status = await makeCancelable(
                getTokenRegisterStatus(inputValue)
            );
            const result = await makeCancelable(
                getSymbolAndDecimals(inputValue)
            );
            const { name, logo } = getNameAndLogo(inputValue);

            setRegisteredStatus(status);
            setToken({ ...result, name, logo, address: inputValue });
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
                                value={inputValue}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    setInputValue(value);

                                    if (!value) {
                                        setIsRegisteredTokenInvalid(false);
                                        return;
                                    }

                                    const isAddress =
                                        Web3.utils.isAddress(value);

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
                            registerToken(inputValue);
                            setAllTokens([{ ...token, status: 2 }, ...data]);
                        }}
                        hidden={
                            registeredStatus === 1 || registeredStatus === 2
                        }
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

                                    setSearch(value);
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
                            {!data.length && <EmptyData />}
                            {data?.map((token, index) => {
                                const { proof } = token;

                                return (
                                    <ListItem
                                        key={token.address}
                                        token={token}
                                        onClick={props.onSelect}
                                        disabled={!token.confirmed}
                                    >
                                        <UpcomingTokenState
                                            token={token}
                                            confirm={() =>
                                                confirmRegister(proof).then(
                                                    () => {
                                                        const newData = [
                                                            ...allTokens,
                                                        ];

                                                        newData[
                                                            index
                                                        ].confirmed = true;
                                                        setAllTokens(newData);
                                                    }
                                                )
                                            }
                                        />
                                    </ListItem>
                                );
                            })}
                        </ListGroup>
                    )}
                </>
            )}
        </>
    );
}

function UpcomingTokenState({ token, confirm }) {
    const { t } = useTranslation();
    const { proof, confirmed } = token;

    if (!proof) {
        return <Spinner animation="border" size="sm" variant="danger" />;
    }

    if (confirmed) {
        return <i className="bi bi-check-circle"></i>;
    }

    return (
        <Button
            size="sm"
            variant="color"
            onClick={confirm}
            style={{
                pointerEvents: "all",
            }}
        >
            {t("Confirm")}
        </Button>
    );
}
