// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { deepseek } from '@ai-sdk/deepseek'
import { db } from '@/db/db'
import { streamText } from 'ai'
import { saveMessage } from '@/actions/message-actions'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Choose model
const getModel = (modelName: string) => {
  switch (modelName) {
    case 'gpt-4o':
      return openai('gpt-4o')
    case 'gpt-4o-mini':
      return openai('gpt-4o-mini')
    case 'deepseek-chat':
      return deepseek('deepseek-chat')
    case 'deepseek-reasoner':
      return deepseek('deepseek-reasoner')
    default:
      return openai('deepseek-chat')
  }
}

export async function POST(req: Request) {
  try {
    const { messages, chatId, model = 'deepseek-chat' } = await req.json()

    const result = streamText({
      model: getModel(model),
      messages,
      async onFinish({ text, finishReason, usage, response }) {
        console.log('---chatId---', chatId)
        console.log('text', text)
        console.log('finishReason', finishReason)
        console.log('usage', usage)
        console.log('response', response)

        // 保存 AI 回复到数据库
        if (chatId && text) {
          await saveMessage('assistant', text, chatId)
        }
      }
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
