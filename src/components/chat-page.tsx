'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sidebar } from '@/components/sidebar'
import { ModelSelector } from '@/components/model-selector'
import { ChatMessage } from '@/components/chat-message'
import { UserMenu } from '@/components/user-menu'
import { SendIcon } from 'lucide-react'
import { getChat, createChat, updateChat } from '@/actions/chat-actions'
import { saveMessage } from '@/actions/message-actions'
import { toast } from 'sonner'

export default function ChatPageClient({ user }: { user: { id: string; email: string; name: string | null } }) {
  const [currentChatId, setCurrentChatId] = useState<string>()
  const [selectedModel, setSelectedModel] = useState('deepseek-chat')
  const [chatTitle, setChatTitle] = useState('')
  const [isPending, startTransition] = useTransition()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { messages, input, handleInputChange, handleSubmit, setMessages, status } = useChat({
    api: '/api/chat',
    body: {
      chatId: currentChatId,
      model: selectedModel
    },
    onFinish: async (message) => {
      console.log('@@@@@@@@@@@@', messages)
      // 如果是新对话的第一条消息，创建聊天记录
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '')
      if (currentChatId && title.length > 0) {
        await saveMessage('user', input, currentChatId)
        await updateChat(currentChatId, title)
        setChatTitle(title)
      }
    }
  })

  // 页面初始化
  useEffect(() => {
    // 如果当前没有 chatId，说明是新会话，创建一个
    if (!currentChatId) {
      const createNewChat = async () => {
        const title = '新对话' // 你也可以让用户输入标题后再创建
        const result = await createChat(user.id, title, selectedModel)

        if (result.success) {
          setCurrentChatId(result.data.id)
          setChatTitle(title)
        } else {
          toast.error(result.error)
        }
      }

      createNewChat()
    }
  }, [currentChatId, selectedModel])

  // 滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages])

  const handleChatSelect = async (chatId: string) => {
    startTransition(async () => {
      const result = await getChat(chatId)
      if (result.success) {
        setCurrentChatId(chatId)
        setChatTitle(result.data.title)
        setSelectedModel(result.data.model)
        setMessages(
          result.data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content
          }))
        )
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    setChatTitle('')
    setMessages([])
  }

  return (
    <div className="flex h-screen bg-white">
      {/* 侧边栏 */}
      <div className="w-64 border-r border-gray-200">
        <Sidebar currentChatId={currentChatId} onChatSelect={handleChatSelect} onNewChat={handleNewChat} />
      </div>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{chatTitle || '新建对话'}</h1>
          <div className="flex items-center gap-4">
            <ModelSelector value={selectedModel} onValueChange={setSelectedModel} />
            <UserMenu user={user} />
          </div>
        </div>

        {/* 消息区域 */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2">开始新对话</h2>
                  <p>选择一个模型并发送消息开始聊天</p>
                </div>
              </div>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} role={message.role as 'user' | 'assistant'} content={message.content} />)
            )}
            {status == 'streaming' && (
              <div className="flex gap-4 p-4 bg-gray-50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500">AI正在思考中...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input value={input} onChange={handleInputChange} placeholder="输入消息..." className="flex-1" disabled={status == 'streaming' || isPending} />
              <Button type="submit" disabled={status == 'streaming' || isPending || !input.trim()}>
                <SendIcon className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
