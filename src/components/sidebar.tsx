'use client'

import type React from 'react'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PlusIcon, MessageSquareIcon, TrashIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserChats, deleteChat } from '@/actions/chat-actions'
import { toast } from 'sonner'

interface Chat {
  id: string
  title: string
  model: string
}

interface SidebarProps {
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
}

export function Sidebar({ currentChatId, onChatSelect, onNewChat }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const result = await getUserChats()
      if (result.success) {
        setChats(result.data)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('获取聊天列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    startTransition(async () => {
      const result = await deleteChat(chatId)
      if (result.success) {
        setChats(chats.filter((chat) => chat.id !== chatId))
        if (currentChatId === chatId) {
          onNewChat()
        }
        toast.success('聊天已删除')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 text-white">
      <div className="p-4">
        <Button onClick={onNewChat} className="w-full bg-gray-500 hover:bg-gray-700 text-white border border-gray-500" disabled={isPending}>
          <PlusIcon className="w-4 h-4 mr-2" />
          新建对话
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {loading ? (
          <div className="p-4 text-center text-gray-400">加载中...</div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-400">暂无对话</div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <div key={chat.id} onClick={() => onChatSelect(chat.id)} className={cn('group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors', currentChatId === chat.id && 'bg-gray-800')}>
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <MessageSquareIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    <p className="text-xs text-gray-400">{chat.model}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={(e) => handleDeleteChat(chat.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-gray-400 hover:text-red-400" disabled={isPending}>
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
