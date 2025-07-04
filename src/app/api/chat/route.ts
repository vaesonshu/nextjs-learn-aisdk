import { deepseek } from '@ai-sdk/deepseek'
import { createDeepSeek } from '@ai-sdk/deepseek'

import { streamText } from 'ai'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  const { messages } = await req.json()

  const result = streamText({
    model: deepseek('deepseek-chat'),

    messages
  })

  return result.toDataStreamResponse()
}
