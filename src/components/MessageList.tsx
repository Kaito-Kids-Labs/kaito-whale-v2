import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../core/useWebSocket'

type Props = {
  messages: ChatMessage[]
  currentUserId: string
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function MessageList({ messages, currentUserId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
        Belum ada pesan
      </div>
    )
  }

  return (
    <div className="flex-1 w-full overflow-y-auto px-2 py-2">
      <ul className="space-y-1">
        {messages.map((message) => {
          const isMe = message.from === currentUserId

          return (
            <li
              key={`${message.timestamp}-${message.from}`}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                }`}
              >
                {!isMe && (
                  <div className="text-[10px] font-semibold text-blue-300 mb-0.5">
                    {message.from}
                  </div>
                )}
                <div className="font-medium">{message.text}</div>
                <div
                  className={`text-[9px] mt-0.5 ${
                    isMe ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </li>
          )
        })}
        <div ref={bottomRef} />
      </ul>
    </div>
  )
}
