import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'

const DISMISS_KEY = 'ggs-install-dismissed'
const DISMISS_DAYS = 14 // don't show again for 14 days after dismiss

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]                     = useState(false)
  const [ios, setIos]                       = useState(false)

  useEffect(() => {
    // Never show if already installed as app
    if (isInStandaloneMode()) return
    // Only show on mobile devices
    if (!isMobile()) return
    // Don't show if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DAYS * 86400000) return

    if (isIOS()) {
      setIos(true)
      setShow(true)
      return
    }

    // Chrome / Android: listen for the native prompt event
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      {/* Backdrop blur for iOS instructions */}
      {ios && (
        <div
          onClick={handleDismiss}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 9998,
          }}
        />
      )}

      {/* Banner */}
      <div style={{
        position: 'fixed',
        bottom: ios ? '0' : '16px',
        left: ios ? '0' : '16px',
        right: ios ? '0' : '16px',
        zIndex: 9999,
        background: '#111111',
        borderRadius: ios ? '20px 20px 0 0' : '16px',
        padding: ios ? '20px 20px 32px' : '16px 20px',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.4)',
        border: '1px solid rgba(196,169,107,0.25)',
      }}>
        {/* Handle bar (iOS sheet style) */}
        {ios && (
          <div style={{
            width: '36px', height: '4px', borderRadius: '2px',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 auto 16px',
          }} />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          {/* App icon */}
          <img
            src="/icon-192.png"
            alt="GGS"
            style={{
              width: '52px', height: '52px',
              borderRadius: '12px',
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'white', margin: '0 0 2px' }}>
              Instalar GGS
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '0 0 14px', lineHeight: '1.4' }}>
              {ios
                ? 'Agregá la app a tu pantalla de inicio para acceder más rápido.'
                : 'Instalá la app para acceder más rápido sin abrir el navegador.'}
            </p>

            {ios ? (
              /* iOS: manual instructions */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(196,169,107,0.15)', border: '1px solid rgba(196,169,107,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#C4A96B' }}>1</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                    Tocá el ícono de{' '}
                    <strong style={{ color: '#C4A96B' }}>Compartir</strong>
                    {' '}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: 'rgba(196,169,107,0.15)',
                      borderRadius: '4px', padding: '1px 5px',
                    }}>
                      <Share size={12} color="#C4A96B" />
                    </span>
                    {' '}en Safari
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(196,169,107,0.15)', border: '1px solid rgba(196,169,107,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#C4A96B' }}>2</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                    Seleccioná{' '}
                    <strong style={{ color: '#C4A96B' }}>"Agregar a pantalla de inicio"</strong>
                    {' '}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: 'rgba(196,169,107,0.15)',
                      borderRadius: '4px', padding: '1px 5px',
                    }}>
                      <Plus size={12} color="#C4A96B" />
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              /* Chrome/Android: one-tap install */
              <button
                onClick={handleInstall}
                style={{
                  padding: '10px 24px',
                  background: '#C4A96B',
                  color: '#111111',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}>
                Instalar app
              </button>
            )}
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}>
            <X size={14} color="rgba(255,255,255,0.5)" />
          </button>
        </div>
      </div>
    </>
  )
}
