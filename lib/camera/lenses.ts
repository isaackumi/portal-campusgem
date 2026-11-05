/**
 * Picking a sensible camera lens for QR scanning. Phones expose many cameras: an iPhone
 * lists "Back Camera", "Back Ultra Wide Camera", "Back Telephoto Camera", "Back Dual Wide
 * Camera", "Back Triple Camera", "Front Camera"…; Android lists "camera2 0, facing back".
 * Ultra-wide and telephoto lenses are darker and focus badly up close, so prefer the
 * main back camera (or the multi-lens one, which switches lenses itself).
 */
export type CameraInfo = { id: string; label: string }

export function isFrontCamera(label: string): boolean {
  return /front|user|facetime|selfie/i.test(label)
}

export function backCameras(cameras: readonly CameraInfo[]): CameraInfo[] {
  return cameras.filter((c) => !isFrontCamera(c.label))
}

/** Short, friendly name for a lens, for the lens menu. */
export function lensName(camera: CameraInfo, index = 0): string {
  const l = camera.label.toLowerCase()
  if (/ultra ?wide/.test(l)) return 'Ultra wide'
  if (/tele/.test(l)) return 'Zoom'
  if (/triple|dual/.test(l)) return 'Auto'
  if (/^back camera$|^rear camera$/.test(l.trim())) return 'Main'
  const n = /camera2? ?(\d+)/.exec(l)?.[1]
  if (n != null) return n === '0' ? 'Main' : `Lens ${n}`
  return camera.label.trim() || `Lens ${index + 1}`
}

/**
 * The best back lens for scanning, or null when none can be told apart (labels are empty
 * before the camera permission is granted).
 */
export function preferredBackCamera(cameras: readonly CameraInfo[]): CameraInfo | null {
  const backs = backCameras(cameras).filter((c) => c.label.trim())
  if (backs.length === 0) return null
  const rank = (c: CameraInfo): number => {
    const l = c.label.toLowerCase().trim()
    if (l === 'back camera' || l === 'rear camera') return 0
    if (/camera2? ?0\b/.test(l)) return 0
    if (/dual wide|triple/.test(l)) return 1
    if (/dual/.test(l)) return 2
    if (/ultra ?wide|tele/.test(l)) return 9
    return 5
  }
  return [...backs].sort((a, b) => rank(a) - rank(b))[0] ?? null
}
