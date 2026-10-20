import React from 'react';

interface AyushLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textSize?: string;
  textClassName?: string;
  brandName?: string;
}

export const AyushLogo: React.FC<AyushLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
  textSize = 'text-xl',
  textClassName = '',
  brandName = 'AyushMuzic',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* AyushMuzic Official Glowing Icon */}
      <div
        className="rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-[#FF3366]/30 transition-transform hover:scale-105 overflow-hidden bg-gradient-to-br from-[#8b5cf6] via-[#ec4899] to-[#FF3366] p-0.5"
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src="/logo.png"
          alt="AyushMuzic"
          className="w-full h-full object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>

      {showText && (
        <span
          className={`font-black tracking-tight text-white ${textSize} ${textClassName} flex items-center`}
          style={{ letterSpacing: '-0.02em' }}
        >
          <span>Ayush</span>
          <span className="bg-gradient-to-r from-[#FF3366] via-[#ec4899] to-[#8b5cf6] bg-clip-text text-transparent ml-0.5">
            Muzic
          </span>
        </span>
      )}
    </div>
  );
};

export const SpotifyLogo = AyushLogo;
