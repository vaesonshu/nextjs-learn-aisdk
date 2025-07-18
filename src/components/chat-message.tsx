'use client'

import { cn } from '@/lib/utils'
import { BotIcon, UserIcon } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={cn('flex gap-4 p-4', role === 'assistant' ? 'bg-gray-50' : 'bg-white')}>
      <div className={cn('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', role === 'assistant' ? 'bg-green-500' : 'bg-blue-500')}>{role === 'assistant' ? <BotIcon className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}</div>
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  )
}
