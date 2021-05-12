import React, {Component} from 'react'
import {withTranslation} from "react-i18next";
import styles from './style.module.scss'

class FormTip extends Component {
    render(){
        const { children, text } = this.props
        return(
            <>
            { ((Array.isArray(text) && text.length > 0) || text || children) ? <div className={styles.box}>
                {Array.isArray(text) && text.map((item) => {
                    return <p key={item.toString()}>{item}</p>
                })}
                {!Array.isArray(text) && <p>{text}</p>}
                {children}
            </div> : null }
            </>
        )
    }
}

export default withTranslation()(FormTip);
