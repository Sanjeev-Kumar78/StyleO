import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => {
  return (
    <h2
      className={`font-bold flex items-center gap-1 tracking-tight select-none text-(--text-primary) font-(family-name:--font-display) ${className}`}
    >
      Style
      <span className="text-(--accent) italic">O</span>
    </h2>
  );
};

export default Logo;
