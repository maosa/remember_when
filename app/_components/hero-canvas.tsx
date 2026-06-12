'use client'

import { useEffect, useRef } from 'react'

export default function HeroCanvas() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const container = mountRef.current
    if (!container) return

    let animationId: number
    let mounted = true
    let teardown: (() => void) | undefined

    async function init() {
      const THREE = await import('three')
      if (!mounted || !container) return

      const W = container.clientWidth
      const H = container.clientHeight

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
      renderer.setSize(W, H)
      Object.assign(renderer.domElement.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      })
      container.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 50)
      camera.position.z = 5

      // Soft circular texture — warm glow fading to transparent
      const texCanvas = document.createElement('canvas')
      texCanvas.width = texCanvas.height = 64
      const texCtx = texCanvas.getContext('2d')!
      const grad = texCtx.createRadialGradient(32, 32, 0, 32, 32, 32)
      grad.addColorStop(0,    'rgba(255,255,255,1.0)')
      grad.addColorStop(0.4,  'rgba(255,255,255,0.6)')
      grad.addColorStop(0.85, 'rgba(255,255,255,0.1)')
      grad.addColorStop(1,    'rgba(255,255,255,0.0)')
      texCtx.fillStyle = grad
      texCtx.fillRect(0, 0, 64, 64)
      const texture = new THREE.CanvasTexture(texCanvas)

      // Fewer particles on mobile for performance
      const N = window.innerWidth < 768 ? 28 : 55

      // Brand palette (normalised 0–1): warm gold, sage green, muted warm grey
      const PALETTE: [number, number, number][] = [
        [200 / 255, 152 / 255,  64 / 255],  // #C89840 warm gold
        [ 92 / 255, 122 / 255, 107 / 255],  // #5C7A6B sage green
        [168 / 255, 163 / 255, 157 / 255],  // #A8A39D warm grey
        [200 / 255, 152 / 255,  64 / 255],  // extra gold weight
        [ 92 / 255, 122 / 255, 107 / 255],  // extra sage weight
      ]

      const positions  = new Float32Array(N * 3)
      const colors     = new Float32Array(N * 3)
      const speeds     = new Float32Array(N)
      const phases     = new Float32Array(N)
      const amplitudes = new Float32Array(N)

      for (let i = 0; i < N; i++) {
        // Spread across a wide 3D field, slightly behind the canvas centre
        positions[i * 3]     = (Math.random() - 0.5) * 14
        positions[i * 3 + 1] = (Math.random() - 0.5) * 10
        positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 1

        const c = PALETTE[Math.floor(Math.random() * PALETTE.length)]
        colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2]

        speeds[i]     = 0.0012 + Math.random() * 0.0016
        phases[i]     = Math.random() * Math.PI * 2
        amplitudes[i] = 0.0004 + Math.random() * 0.0009
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3))

      const material = new THREE.PointsMaterial({
        size:            0.28,
        map:             texture,
        vertexColors:    true,
        transparent:     true,
        opacity:         0.20,
        blending:        THREE.NormalBlending,
        depthWrite:      false,
        sizeAttenuation: true,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)

      let tick = 0
      function loop() {
        if (!mounted) return
        animationId = requestAnimationFrame(loop)
        tick++

        const pos = geometry.attributes.position.array as Float32Array
        for (let i = 0; i < N; i++) {
          pos[i * 3 + 1] += speeds[i]  // slow upward drift
          pos[i * 3]     += Math.sin(tick * 0.005 + phases[i]) * amplitudes[i]  // gentle sway

          // Wrap back to the bottom once off the top
          if (pos[i * 3 + 1] > 5.5) {
            pos[i * 3 + 1] = -5.5
            pos[i * 3]     = (Math.random() - 0.5) * 14
          }
        }
        geometry.attributes.position.needsUpdate = true
        renderer.render(scene, camera)
      }
      loop()

      function onResize() {
        if (!container) return
        const W2 = container.clientWidth
        const H2 = container.clientHeight
        camera.aspect = W2 / H2
        camera.updateProjectionMatrix()
        renderer.setSize(W2, H2)
      }
      window.addEventListener('resize', onResize, { passive: true })

      teardown = () => {
        window.removeEventListener('resize', onResize)
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement)
        }
        renderer.dispose()
        geometry.dispose()
        material.dispose()
        texture.dispose()
      }
    }

    init()

    return () => {
      mounted = false
      cancelAnimationFrame(animationId)
      teardown?.()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    />
  )
}
