/* eslint-disable react/prop-types */
import jazzicon from '@metamask/jazzicon';
import React from 'react';
import { useEffect, useRef } from 'react';

const cache = {};

function generateIdenticonSvg(address, diameter) {
  const cacheId = `${address}:${diameter}`;
  // check cache, lazily generate and populate cache
  const identicon = cache[cacheId] || (cache[cacheId] = generateNewIdenticon(address, diameter));
  // create a clean copy so you can modify it
  const cleanCopy = identicon.cloneNode(true);

  return cleanCopy;
}

function generateNewIdenticon(address, diameter) {
  const numericRepresentation = jsNumberForAddress(address);
  const identicon = jazzicon(diameter, numericRepresentation);

  return identicon;
}

function jsNumberForAddress(address) {
  // eslint-disable-next-line no-magic-numbers
  const addr = address.slice(2, 10);
  const seed = parseInt(addr, 16);

  return seed;
}

// eslint-disable-next-line no-magic-numbers
export default function JazzIcon({ address, className = '', style = {}, diameter = 46 }) {
  const container = useRef();

  useEffect(() => {
    const element = generateIdenticonSvg(address, diameter);

    container.current.childNodes.forEach((node) => container.current.removeChild(node));
    container.current.appendChild(element);
  }, [address, diameter]);

  return <div className={className} ref={container} style={style}></div>;
}
