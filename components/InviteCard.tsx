// Arte de la invitación del cumple: "HELLO" y "50" gigantes en rosa sobre el
// rojo, "Ine" manuscrito en blanco y una copa con una rodaja de cítrico. Es
// decorativo (aria-hidden): el contexto lo dan los textos de la pantalla.
//
// Todo se mide en cqw (ancho de la tarjeta), así la composición es idéntica en
// cualquier ancho. Posiciones calculadas con las métricas de Anton: mayúscula
// de 0,859 em, que con leading 1 arranca 0,0645 em debajo del borde de la caja;
// "HELLO" mide 2,19 em de ancho y "50", 0,99 em.
//
// banner (3:2, /subir): bajo, para que "Sacar foto" entre sin scrollear.
// poster (4:5, home): la proporción de la invitación.
const LAYOUT = {
  banner: {
    box: 'aspect-[3/2] max-w-[57svh]', // alto <= 38svh
    hello: 'left-[-3cqw] top-[-15.2cqw] text-[49.3cqw]',
    fifty: 'left-[55.6cqw] top-[31.2cqw] text-[46cqw]',
    ine: 'left-[17cqw] top-[15cqw] text-[25cqw]',
    glass: 'left-[-7cqw] top-[33cqw] w-[30cqw]',
  },
  poster: {
    box: 'aspect-[4/5] max-w-[48svh]',
    hello: 'left-[-3cqw] top-[-15.2cqw] text-[49.3cqw]',
    fifty: 'left-[30cqw] top-[62.6cqw] text-[72cqw]',
    ine: 'left-[13cqw] top-[21cqw] text-[33cqw]',
    glass: 'left-[-12cqw] top-[55cqw] w-[50cqw]',
  },
} as const

export function InviteCard({
  variant = 'banner',
  className = '',
}: {
  variant?: keyof typeof LAYOUT
  className?: string
}) {
  const l = LAYOUT[variant]
  return (
    <div aria-hidden className={`overflow-hidden bg-invite ${className}`}>
      {/* Sin overflow-hidden acá: las letras se recortan contra el borde de la pantalla. */}
      <div className={`relative mx-auto w-full select-none [container-type:inline-size] ${l.box}`}>
        <span className={`absolute font-display leading-none text-blush ${l.hello}`}>HELLO</span>
        <span className={`absolute font-display leading-none text-blush ${l.fifty}`}>50</span>
        <WineGlass className={`absolute -rotate-[14deg] text-white ${l.glass}`} />
        {/* Contorno de 1px del mismo color: engrosa el trazo hacia el pincel de la invitación. */}
        <span
          className={`absolute -rotate-[8deg] font-script leading-none text-white [-webkit-text-stroke:1px_currentColor] [paint-order:stroke_fill] ${l.ine}`}
        >
          Ine
        </span>
      </div>
    </div>
  )
}

// Copa en trazo blanco: cáliz con el vino, rodaja de cítrico adentro, tallo y pie.
function WineGlass({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 100 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14 10 C 6 52, 20 78, 50 82 C 80 78, 94 52, 86 10 Z" />
      <path d="M11 36 C 32 46, 68 46, 89 36" />
      <circle cx="40" cy="58" r="15" />
      <circle cx="40" cy="58" r="10.5" />
      <path d="M40 47.5 V 68.5 M29.5 58 H 50.5 M32.6 50.6 L 47.4 65.4 M47.4 50.6 L 32.6 65.4" />
      <path d="M50 82 C 49 104, 51 124, 50 144" />
      <path d="M22 150 C 36 142, 64 142, 78 150" />
    </svg>
  )
}
