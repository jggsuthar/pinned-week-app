'use client';

import React from 'react';
import Image from 'next/image';
import brandLogoImg from '../../Assets/Logo.png';

export const BrandLogoLink: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <a
      href="https://jaiminsuthar.com"
      target="_blank"
      rel="noopener noreferrer"
      title="Visit jaiminsuthar.com"
      className={`inline-flex items-center transition-opacity hover:opacity-80 shrink-0 ${className}`}
    >
      <Image
        src={brandLogoImg}
        alt="Jaimin Suthar"
        height={32}
        className="h-7 sm:h-8 w-auto object-contain"
        priority
      />
    </a>
  );
};
