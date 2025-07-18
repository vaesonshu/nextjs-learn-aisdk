// app/chat/page.tsx
import { getCurrentUser } from '@/actions/auth-actions'
import { redirect } from 'next/navigation'
import ChatPageClient from '@/components/chat-page'

export default async function ChatPage() {
  const userResult = await getCurrentUser()

  if (!userResult.success || !userResult.data) {
    redirect('/login')
  }

  const user = userResult.data

  return <ChatPageClient user={user} />
}
