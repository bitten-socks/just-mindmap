// src/AdFit.js

import React, { useEffect, useRef } from 'react';

const AdFit = ({ unit, width, height, disabled }) => {
  const adRef = useRef(null);

  useEffect(() => {
    // disabled prop이 true이면 광고를 로드하지 않음
    if (disabled) {
      return;
    }

    // 광고 컨테이너가 있고, 그 안에 iframe이 없으면 광고를 로드
    if (adRef.current && !adRef.current.querySelector("iframe")) {
        if (window.adsbykakao && typeof window.adsbykakao.push === 'function') {
            window.adsbykakao.push({});
        }
    }
  }, [disabled]);

  if (disabled) {
    return null;
  }

  return (
    <ins
      ref={adRef}
      className="kakao_ad_area"
      style={{ display: 'none' }}
      data-ad-unit={unit}
      data-ad-width={width}
      data-ad-height={height}
    ></ins>
  );
};

export default AdFit;