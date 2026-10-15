import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  // useSyncExternalStore reads the media query as an external system instead of
  // mirroring it into state inside an effect (which caused a render cascade).
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
