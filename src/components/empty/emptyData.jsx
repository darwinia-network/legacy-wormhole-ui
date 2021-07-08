/* eslint-disable react/prop-types */
import React from 'react';
import { useTranslation } from 'react-i18next';
import './emptyData.scss';

export default function EmptyData({ text = 'Empty data', options = {}, className = '' }) {
  const { t } = useTranslation();

  return <div className={['empty', className].join(' ')}>{t(text, options)}</div>;
}
