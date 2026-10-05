import React from 'react';

interface MotoniveladoraIconProps {
  className?: string;
  size?: number;
}

export const MotoniveladoraIcon: React.FC<MotoniveladoraIconProps> = ({ 
  className = "w-6 h-6", 
  size 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 100 65" 
      fill="currentColor"
      width={size}
      height={size}
      className={className}
      aria-label="Motoniveladora"
    >
      {/* 1. Chasis largo y curvado delantero (Gooseneck) */}
      <path 
        d="M 44 26 C 52 17, 68 15, 84 28 L 84 32 C 68 20, 54 22, 44 32 Z" 
        fill="currentColor"
      />
      {/* Bloque de empuje frontal */}
      <rect x="83" y="27" width="5" height="10" rx="1" fill="currentColor" />

      {/* 2. Cabina central elevada */}
      <path 
        d="M 33 8 L 47 8 L 49 26 L 31 26 Z" 
        fill="currentColor"
      />
      {/* Ventanales de la cabina (recorte) */}
      <polygon points="34,11 40,11 40,23 33,23" fill="#0a2342" />
      <polygon points="42,11 46,11 47,23 42,23" fill="#0a2342" />

      {/* 3. Capó del motor trasero */}
      <rect x="12" y="24" width="22" height="12" rx="2" fill="currentColor" />
      {/* Tubo de escape vertical */}
      <rect x="17" y="14" width="2.5" height="10" rx="0.5" fill="currentColor" />

      {/* 4. Mecanismo de cuchilla central con círculo de giro */}
      {/* Cilindros hidráulicos */}
      <line x1="56" y1="20" x2="57" y2="34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="64" y1="22" x2="65" y2="34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Hoja / Cuchilla niveladora central característica debajo del vehículo */}
      <path 
        d="M 49 35 L 70 34 L 68 45 L 47 46 Z" 
        fill="currentColor"
      />
      {/* Borde de corte de la cuchilla */}
      <line x1="46" y1="47" x2="69" y2="46" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

      {/* 5. Tándem trasero (2 ruedas traseras) */}
      {/* Rueda trasera 1 */}
      <circle cx="18" cy="46" r="11" fill="currentColor" />
      <circle cx="18" cy="46" r="6" fill="#0a2342" />
      <circle cx="18" cy="46" r="2.5" fill="currentColor" />
      
      {/* Rueda trasera 2 */}
      <circle cx="36" cy="46" r="11" fill="currentColor" />
      <circle cx="36" cy="46" r="6" fill="#0a2342" />
      <circle cx="36" cy="46" r="2.5" fill="currentColor" />

      {/* 6. Rueda delantera grande */}
      <circle cx="82" cy="46" r="11" fill="currentColor" />
      <circle cx="82" cy="46" r="6" fill="#0a2342" />
      <circle cx="82" cy="46" r="2.5" fill="currentColor" />
      
      {/* Brazo de dirección delantero */}
      <line x1="82" y1="35" x2="82" y2="44" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};
