'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#C2255C', '#C89B3C', '#D9A7AC', '#FFFBF8']
const PIECE_COUNT = 18

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
      color: COLORS[i % COLORS.length] ?? '#C2255C',
      delay: Math.random() * 0.15,
      duration: 1.1 + Math.random() * 0.6,
      rotate: Math.random() * 360,
    }))
    setPieces(next)

    const timeout = setTimeout(() => setPieces([]), 2000)
    return () => clearTimeout(timeout)
  }, [trigger])

  if (pieces.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 h-3 w-2 rounded-sm"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
