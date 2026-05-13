import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISS_KEY  = 'ggs-install-dismissed'
const DISMISS_DAYS = 14

/* ── Browser / platform detection ── */
const ua = navigator.userAgent

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}
function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
}
function isIOS() {
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream
}
// Safari on iOS: WebKit present, no CriOS / FxiOS / OPiOS markers
function isIOSSafari() {
  return isIOS() && /WebKit/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
}

/* ── Shared styles ── */
const stepBadge = {
  width: '24px', height: '24px', borderRadius: '50%',
  background: 'rgba(196,169,107,0.15)',
  border: '1px solid rgba(196,169,107,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow]   = useState(false)
  const [mode, setMode]   = useState(null) // 'safari' | 'ios-other' | 'android'

  useEffect(() => {
    if (isInStandaloneMode())  return
    if (!isMobileDevice())     return

    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - parseInt(dismissed) < DISMISS_DAYS * 86400000) return

    if (isIOS()) {
      setMode(isIOSSafari() ? 'safari' : 'ios-other')
      setShow(true)
      return
    }

    // Android / Chrome — wait for native prompt
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setMode('android')
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

  const isSheet = mode === 'safari' || mode === 'ios-other'

  return (
    <>
      {/* Backdrop */}
      {isSheet && (
        <div onClick={handleDismiss} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Card */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0, right: 0,
        zIndex: 9999,
        background: '#1a1a1a',
        borderRadius: '24px 24px 0 0',
        padding: '0 0 max(24px, env(safe-area-inset-bottom))',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderBottom: 'none',
      }}>

        {/* Handle */}
        <div style={{
          width: '40px', height: '4px', borderRadius: '2px',
          background: 'rgba(255,255,255,0.15)',
          margin: '12px auto 0',
        }} />

        <div style={{ padding: '20px 24px 8px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            {/* Favicon as app icon */}
            <img src="/favicon.svg" alt="GGS" style={{
              width: '56px', height: '56px',
              borderRadius: '14px',
              flexShrink: 0,
              border: '1px solid rgba(196,169,107,0.3)',
              background: '#111',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: 'white', margin: '0 0 3px' }}>
                GGS Seguros
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                ggs-gt.com
              </p>
            </div>
            <button onClick={handleDismiss} style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none', borderRadius: '50%',
              width: '30px', height: '30px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}>
              <X size={14} color="rgba(255,255,255,0.5)" />
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />

          {/* Content by mode */}
          {mode === 'safari' && (
            <>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '0 0 16px', lineHeight: '1.5' }}>
                Agregá esta app a tu pantalla de inicio para acceder rápido, sin el navegador.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={stepBadge}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#C4A96B' }}>1</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                    Tocá <span style={{ color: '#C4A96B', fontWeight: 600 }}>Compartir</span>
                    {' '}en la barra de Safari{' '}
                    <span style={{
                      display: 'inline-block', fontSize: '15px',
                      verticalAlign: 'middle', lineHeight: 1,
                    }}>⬆️</span>
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={stepBadge}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#C4A96B' }}>2</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
                    Seleccioná{' '}
                    <span style={{ color: '#C4A96B', fontWeight: 600 }}>"Agregar a inicio"</span>
                    {' '}
                    <span style={{ verticalAlign: 'middle' }}>➕</span>
                  </p>
                </div>
              </div>
              <button onClick={handleDismiss} style={{
                width: '100%', padding: '13px',
                background: '#C4A96B', color: '#111111',
                border: 'none', borderRadius: '12px',
                fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              }}>
                Entendido
              </button>
            </>
          )}

          {mode === 'ios-other' && (
            <>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '0 0 16px', lineHeight: '1.5' }}>
                Para instalar la app en tu iPhone, abrí esta página en{' '}
                <span style={{ color: '#C4A96B', fontWeight: 600 }}>Safari</span>
                {' '}y usá la opción "Agregar a inicio".
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDismiss} style={{
                  flex: 1, padding: '13px',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Ahora no
                </button>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); toast?.('URL copiada'); handleDismiss() }}
                  style={{
                    flex: 1, padding: '13px',
                    background: '#C4A96B', color: '#111111',
                    border: 'none', borderRadius: '12px',
                    fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  }}>
                  Copiar enlace
                </button>
              </div>
            </>
          )}

          {mode === 'android' && (
            <>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', margin: '0 0 20px', lineHeight: '1.5' }}>
                Instalá la app en tu teléfono para acceder más rápido, sin abrir el navegador.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleDismiss} style={{
                  flex: 1, padding: '13px',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}>
                  Ahora no
                </button>
                <button onClick={handleInstall} style={{
                  flex: 1, padding: '13px',
                  background: '#C4A96B', color: '#111111',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                }}>
                  Instalar
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
