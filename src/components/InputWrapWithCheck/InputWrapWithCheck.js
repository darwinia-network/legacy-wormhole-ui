import React, {Component} from 'react'
import {withTranslation} from "react-i18next";
import styles from './style.module.scss'
import { Form } from 'react-bootstrap'


class InputRightWrap extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            isDisable: props.defaultIsDisable
        }
    }

    toggleCheck = () => {
        const { onChange } = this.props;
        const value = {
            target: {
                value: ''
            }
        }
        onChange(value);

        this.setState({
            isDisable: !this.state.isDisable
        })
    }

    handleMax = () => {
        const { onClick } = this.props;
        const { isDisable } = this.state;
        if(!isDisable) {
            onClick();
        }
    }

    handleInputChange = (value) => {
        const { onChange } = this.props;
        onChange(value);
    }

    render(){
        const {label, text, placeholder, inputText } = this.props;
        const { isDisable } = this.state;
        const disableStyle = isDisable ? styles.disabled : '';

        return(
            <div className={`${styles.box}`}>
                <Form.Check className="noselect" checked={!isDisable} onChange={() => this.toggleCheck()} inline label={label} type="checkbox" id={label} />
                <Form.Control type="number" className={disableStyle} value={inputText}
                    autoComplete="off"
                    placeholder={placeholder}
                    disabled={isDisable}
                    onChange={(value) => this.handleInputChange(value)} />
                <div className={`${styles.maxbox} ${disableStyle}`} onClick={this.handleMax}>
                    <span className={styles.max}>{text}</span>
                </div>
            </div>
        )
    }
}


export default withTranslation()(InputRightWrap);
