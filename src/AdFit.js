// src/AdFit.js

import React, { useEffect, useRef } from 'react';

const AdFit = ({ unit, width, height }) => {
  const adRef = useRef(null);

  useEffect(() => {
    // 광고 컨테이너가 있고, 그 안에 iframe이 없으면 광고를 로드
    if (adRef.current && !adRef.current.querySelector("iframe")) {
        
        // [수정] window.adsbykakao가 있든 없든, 우선 요청을 대기열(queue)에 넣습니다.
        // 스크립트 로딩이 끝나면 이 대기열을 확인하고 광고를 표시합니다.
        (window.adsbykakao = window.adsbykakao || []).push({});

    }
  // useEffect가 처음 한번만 실행되도록 빈 배열을 유지합니다.
  }, []);

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