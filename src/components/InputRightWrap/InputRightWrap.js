import React, {Component} from 'react'
import {withTranslation} from "react-i18next";
import styles from './style.module.scss'
import { Form } from 'react-bootstrap'


class InputRightWrap extends Component {
    constructor(props, context) {
        super(props, context);
    }

    render(){
        const {label, children, text, onClick, } = this.props;
        return(
            <div className={`${styles.box} `}>
                {children}
                <div className={styles.maxbox} onClick={onClick}>
                    <span className={styles.max}>{text}</span>
                </div>
            </div>
        )
    }
}


export default withTranslation()(InputRightWrap);
