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

      // Palette sourced live from the theme tokens so the particles follow the
      // selected palette: accent-2 (warm decorative accent, weighted 2×), accent
      // (primary, weighted 2×) and text-placeholder (muted grey). THREE.Color
      // parses the hex token strings and returns normalised r/g/b.
      const readColor = (token: string): [number, number, number] => {
        const cs = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
        const c = new THREE.Color(cs || '#808080')
        return [c.r, c.g, c.b]
      }
      const buildPalette = (): [number, number, number][] => {
        const warm    = readColor('--rw-color-accent-2')
        const primary = readColor('--rw-color-accent')
        const grey    = readColor('--rw-color-text-placeholder')
        return [warm, primary, grey, warm, primary]
      }
      let palette = buildPalette()
      // Each particle keeps a stable palette index, so recolouring on a theme
      // change remaps in place with no visible reshuffle.
      const paletteIdx = new Uint8Array(N)

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

        const idx = Math.floor(Math.random() * palette.length)
        paletteIdx[i] = idx
        const c = palette[idx]
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
      let isVisible = true

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

      // Pause the render loop when the canvas is scrolled out of view
      const visibilityObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]
          if (entry.isIntersecting && !isVisible) {
            isVisible = true
            loop()
          } else if (!entry.isIntersecting && isVisible) {
            isVisible = false
            cancelAnimationFrame(animationId)
          }
        },
        { threshold: 0.01 },
      )
      visibilityObserver.observe(container)

      // Re-read the palette from the theme tokens whenever data-theme flips on
      // <html> (e.g. a signed-in user changes theme without a full reload).
      function recolor() {
        palette = buildPalette()
        const arr = geometry.attributes.color.array as Float32Array
        for (let i = 0; i < N; i++) {
          const c = palette[paletteIdx[i]]
          arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]
        }
        geometry.attributes.color.needsUpdate = true
      }
      const themeObserver = new MutationObserver(recolor)
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      })

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
        visibilityObserver.disconnect()
        themeObserver.disconnect()
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
