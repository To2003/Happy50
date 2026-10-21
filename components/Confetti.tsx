'use client'

import { useEffect, useState } from 'react'

// Rojo, rosa y blanco de la invitación.
const COLORS = ['#C8302B', '#FEA3E0', '#FFFFFF']
const PIECE_COUNT = 16

interface Piece {
  id: number
  left: number
  color: string
  delay: number
  duration: number
  rotate: number
}

// Se dispara una vez por cada foto que termina de subirse con éxito — un
// solo momento orquestado, no una animación ambiente.
export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    if (trigger === 0) return

    const next: Piece[] = Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length] ?? '#C8302B',
      delay: Math.random() * 0.12,
      duration: 0.9 + Math.random() * 0.4,
      rotate: Math.random() * 360,
    }))
    setPieces(next)

    const timeout = setTimeout(() => setPieces([]), 1600)
    return () => clearTimeout(timeout)
  }, [trigger])

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 h-2.5 w-1 rounded-full"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s cubic-bezier(0.33, 0, 0.67, 1) ${piece.delay}s both`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
