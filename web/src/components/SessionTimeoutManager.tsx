import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react'

// 15 minutes total inactivity limit (900 seconds)
const TIMEOUT_DURATION_MS = 15 * 60 * 1000
// Show warning dialog 60 seconds before expiration (14 minutes elapsed)
const WARNING_BEFORE_MS = 60 * 1000

export default function SessionTimeoutManager() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()

  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(60)

  const lastActivityRef = useRef<number>(Date.now())
  const countdownIntervalRef = useRef<any>(null)
  const checkIntervalRef = useRef<any>(null)

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    if (showWarning) {
      setShowWarning(false)
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
    }
  }, [showWarning])

  const handleLogout = useCallback(() => {
    setShowWarning(false)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
    logout()
    navigate('/?expired=1', { replace: true })
  }, [logout, navigate])

  const handleStayLoggedIn = () => {
    resetActivity()
  }

  // Setup user interaction listeners
  useEffect(() => {
    if (!token) return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    let lastThrottled = 0

    const onUserAction = () => {
      const now = Date.now()
      // Throttle event updates to once every 2 seconds for high performance
      if (now - lastThrottled > 2000) {
        lastThrottled = now
        if (!showWarning) {
          lastActivityRef.current = now
        }
      }
    }

    events.forEach(evt => window.addEventListener(evt, onUserAction, { passive: true }))

    // Background checker every 2 seconds
    checkIntervalRef.current = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current

      // Time to show warning dialog
      if (idleTime >= TIMEOUT_DURATION_MS - WARNING_BEFORE_MS && !showWarning) {
        setShowWarning(true)
        const initialSeconds = Math.max(1, Math.round((TIMEOUT_DURATION_MS - idleTime) / 1000))
        setSecondsRemaining(initialSeconds)

        // Start 1-second countdown
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = setInterval(() => {
          setSecondsRemaining(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current)
              handleLogout()
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else if (idleTime >= TIMEOUT_DURATION_MS) {
        handleLogout()
      }
    }, 2000)

    return () => {
      events.forEach(evt => window.removeEventListener(evt, onUserAction))
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [token, showWarning, handleLogout])

  if (!showWarning || !token) return null

  const progressPercent = (secondsRemaining / 60) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: 20, width: '100%', maxWidth: 460, padding: 28,
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)',
        textAlign: 'center', color: '#e2e8f0', fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(245, 158, 11, 0.12)', border: '1.5px solid rgba(245, 158, 11, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px', boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
        }}>
          <Clock size={32} color="#fbbf24" />
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#f8fafc', margin: '0 0 8px' }}>
          Session Inactivity Warning
        </h3>

        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px' }}>
          You have been inactive for 14 minutes. For governmental data protection and civil service compliance, your session will automatically terminate in:
        </p>

        {/* Big countdown badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '10px 24px', borderRadius: 12, marginBottom: 20,
        }}>
          <ShieldAlert size={20} color="#fbbf24" />
          <span style={{ fontSize: 24, fontWeight: 900, color: '#fbbf24', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{
          width: '100%', height: 6, background: 'rgba(148, 163, 184, 0.15)',
          borderRadius: 4, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{
            width: `${progressPercent}%`, height: '100%',
            background: secondsRemaining <= 15 ? '#ef4444' : '#f59e0b',
            transition: 'width 1s linear, background 0.3s ease',
          }} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={16} /> Log Out Now
          </button>

          <button
            type="button"
            onClick={handleStayLoggedIn}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #1D70B8, #0F2942)', border: 'none',
              color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(29, 112, 184, 0.4)', transition: 'all 0.2s',
            }}
          >
            <CheckCircle2 size={16} /> Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}

