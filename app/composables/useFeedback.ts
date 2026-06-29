// Tactile + audible confirmation for key actions (e.g. completing a sale).
// Web Audio (no asset) + Vibration API; both degrade silently where unsupported.
// Useful in a noisy store and for elder cashiers who want a clear "it worked" cue.

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioCtx ??= new Ctor()
  return audioCtx
}

function tone(freq: number, startOffset: number, dur: number) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ctx.currentTime + startOffset
  // Quick attack/decay envelope so it reads as a soft chime, not a click.
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.start(t)
  osc.stop(t + dur)
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern) } catch { /* unsupported */ }
  }
}

export function useFeedback() {
  // Browsers auto-suspend the context until a user gesture; resume on use.
  function ensure() {
    const c = getCtx()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
  }

  // Feedback is always best-effort — never let an audio/vibration failure
  // break the calling flow (toast, cart clearing, navigation).
  function success() {
    try {
      ensure()
      vibrate(60)
      tone(880, 0, 0.12)      // rising two-tone "ta-da"
      tone(1175, 0.11, 0.18)
    } catch { /* unsupported / blocked */ }
  }

  function error() {
    try {
      ensure()
      vibrate([0, 80, 60, 80])
      tone(220, 0, 0.3)        // low buzz
    } catch { /* unsupported / blocked */ }
  }

  return { success, error }
}
