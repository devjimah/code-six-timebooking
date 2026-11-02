// Moves a carousel on by itself and reports how far along the current slide is, for a progress bar.
// It stops while it is off screen, or while the element with pauseProps is hovered or focused.
// It never starts by itself for people who prefer reduced motion.
import * as React from "react"

const TICK_MS = 50

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function useAutoplay(advance: () => void, durationMs: number) {
  const [paused, setPaused] = React.useState(prefersReducedMotion)
  const [interacting, setInteracting] = React.useState(false)
  const [onScreen, setOnScreen] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const elapsed = React.useRef(0)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry!.isIntersecting), { threshold: 0.3 })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const running = !paused && !interacting && onScreen

  React.useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      elapsed.current += TICK_MS
      if (elapsed.current >= durationMs) {
        elapsed.current = 0
        advance()
      }
      setProgress((elapsed.current / durationMs) * 100)
    }, TICK_MS)
    return () => clearInterval(timer)
  }, [running, advance, durationMs])

  /** Call when the slide changed, so the bar starts again. */
  const restart = React.useCallback(() => {
    elapsed.current = 0
    setProgress(0)
  }, [])

  const pauseProps = {
    onMouseEnter: () => setInteracting(true),
    onMouseLeave: () => setInteracting(false),
    onFocus: () => setInteracting(true),
    onBlur: () => setInteracting(false),
  }

  return { paused, setPaused, progress, restart, containerRef, pauseProps }
}
