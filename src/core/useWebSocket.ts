import { useCallback, useEffect, useRef, useState } from 'react'

export type ChatMessage = {
  from: string
  to: string
  text: string
  timestamp: number
}

const BASE_URL = import.meta.env.VITE_WS_URL || 'ws://168.231.118.74:8080/ws'

export function useWebSocket(userId: string, peerId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  const userIdRef = useRef(userId)
  const peerIdRef = useRef(peerId)
  userIdRef.current = userId
  peerIdRef.current = peerId

  useEffect(() => {
    if (!userId) {
      console.log('[KAITO][WS] userId kosong, tidak konek')
      return
    }

    let isMounted = true

    const connect = () => {
      if (!isMounted) return

      const url = `${BASE_URL}?userId=${encodeURIComponent(userId)}`
      console.log('[KAITO][WS] connecting', url)

      let ws: WebSocket
      try {
        ws = new WebSocket(url)
        wsRef.current = ws
      } catch (error) {
        console.error('[KAITO][WS] gagal buat WebSocket', String(error))
        // Coba lagi nanti
        reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
        return
      }

      ws.onopen = () => {
        console.log('[KAITO][WS] OPEN sebagai', userId)
      }

      ws.onerror = (event) => {
        console.error('[KAITO][WS] error', event)
      }

      ws.onclose = (event) => {
        console.log('[KAITO][WS] close', event.code, event.reason)
        wsRef.current = null
        // Auto-reconnect jika komponen masih mount
        if (isMounted) {
          console.log('[KAITO][WS] mencoba reconnect dalam 3 detik...')
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000)
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg: ChatMessage = JSON.parse(event.data)
          console.log(
            '[KAITO][WS][RECV] from=', msg.from,
            'to=', msg.to,
            'text=', msg.text,
          )
          setMessages((prev) => [...prev, msg])
        } catch (error) {
          console.error('[KAITO][WS] payload invalid', String(error), 'raw=', event.data)
        }
      }
    }

    // Debounce awal saat userId berubah
    const debounce = setTimeout(connect, 400)

    return () => {
      isMounted = false
      clearTimeout(debounce)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        console.log('[KAITO][WS] cleanup, closing socket')
        // Hapus onclose handler agar tidak memicu reconnect saat unmount
        wsRef.current.onclose = null
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [userId])

  const sendMessage = useCallback((text: string) => {
    const currentUserId = userIdRef.current
    const currentPeerId = peerIdRef.current

    if (!currentUserId || !currentPeerId) {
      console.warn('[KAITO][WS][SEND_FAIL] userId atau peerId kosong')
      return
    }

    if (!wsRef.current) {
      console.warn('[KAITO][WS][SEND_FAIL] tidak ada socket aktif. text=', text)
      return
    }
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(
        '[KAITO][WS][SEND_FAIL] socket belum OPEN, state=',
        wsRef.current.readyState,
        'text=',
        text,
      )
      return
    }

    const msg: ChatMessage = {
      from: currentUserId,
      to: currentPeerId,
      text,
      timestamp: Date.now(),
    }

    const payload = { to: msg.to, text: msg.text }

    try {
      console.log('[KAITO][WS][SEND_OK] from=', currentUserId, 'to=', payload.to, 'text=', payload.text)
      wsRef.current.send(JSON.stringify(payload))
      setMessages((prev) => [...prev, msg])
    } catch (error) {
      console.error(
        '[KAITO][WS][SEND_FAIL] error saat mengirim',
        String(error),
        'to=',
        payload.to,
        'text=',
        payload.text,
      )
    }
  }, [])

  return { messages, sendMessage }
}
