import { describe, expect, test } from 'bun:test'
import { backCameras, lensName, preferredBackCamera } from './lenses'

const iphone = [
  { id: 'f1', label: 'Front Camera' },
  { id: 'f2', label: 'Front Ultra Wide Camera' },
  { id: 'b1', label: 'Back Ultra Wide Camera' },
  { id: 'b2', label: 'Back Telephoto Camera' },
  { id: 'b3', label: 'Back Triple Camera' },
  { id: 'b4', label: 'Back Dual Wide Camera' },
  { id: 'b5', label: 'Back Camera' },
  { id: 'b6', label: 'Back Dual Camera' },
]

describe('preferredBackCamera', () => {
  test('iPhone: the main back camera, not ultra wide or telephoto', () => {
    expect(preferredBackCamera(iphone)?.id).toBe('b5')
  })
  test('iPhone without a plain "Back Camera": the multi-lens one', () => {
    expect(preferredBackCamera(iphone.filter((c) => c.id !== 'b5'))?.id).toBe('b3')
  })
  test('Android: camera 0 facing back', () => {
    const android = [
      { id: 'a1', label: 'camera2 1, facing front' },
      { id: 'a2', label: 'camera2 2, facing back' },
      { id: 'a0', label: 'camera2 0, facing back' },
    ]
    expect(preferredBackCamera(android)?.id).toBe('a0')
  })
  test('no labels yet (before permission): null', () => {
    expect(preferredBackCamera([{ id: 'x', label: '' }])).toBeNull()
  })
})

describe('lensName / backCameras', () => {
  test('friendly names', () => {
    expect(backCameras(iphone).map((c) => lensName(c))).toEqual(['Ultra wide', 'Zoom', 'Auto', 'Auto', 'Main', 'Auto'])
    expect(lensName({ id: 'a', label: 'camera2 2, facing back' })).toBe('Lens 2')
  })
  test('front cameras are excluded', () => {
    expect(backCameras(iphone).map((c) => c.id)).toEqual(['b1', 'b2', 'b3', 'b4', 'b5', 'b6'])
  })
})
