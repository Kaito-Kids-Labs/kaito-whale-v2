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
      <div className="flex-1 w-full flex items-center justify-center text-blue-200/70 text-xs bg-blue-900/20 rounded-3xl border border-blue-800/30 shadow-inner">
        Belum ada pesan
      </div>
    )
  }

  return (
    <div className="flex-1 w-full overflow-y-auto p-4 bg-blue-900/20 rounded-3xl border border-blue-800/30 shadow-inner">
      <ul className="space-y-3">
        {messages.map((message) => {
          const isMe = message.from === currentUserId

          return (
            <li
              key={`${message.timestamp}-${message.from}`}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-md ${
                  isMe
                    ? 'bg-blue-500 text-white rounded-br-sm border border-blue-400'
                    : 'bg-slate-700/80 text-slate-100 rounded-bl-sm border border-slate-600/50 backdrop-blur-sm'
                }`}
              >
                {!isMe && (
                  <div className="text-[11px] font-bold text-emerald-400 mb-1 tracking-wide">
                    {message.from}
                  </div>
                )}
                <div className="font-medium leading-relaxed text-[15px]">{message.text}</div>
                <div
                  className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                    isMe ? 'text-blue-200 justify-end' : 'text-slate-400 justify-start'
                  }`}
                >
                  {formatTime(message.timestamp)}
                  {isMe && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.815a.75.75 0 011.05-.145z" clipRule="evenodd" />
                    </svg>
                  )}
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
