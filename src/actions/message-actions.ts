'use server'

import { db } from '@/db/db'
import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// 定义通用响应类型
type ActionResponse<T> = { success: true; data: T } | { success: false; error: string }

// 错误处理函数
function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return '记录不存在'
      case 'P2003':
        return '外键约束失败'
      default:
        return `数据库错误: ${error.message}`
    }
  }
  return `未知错误: ${error instanceof Error ? error.message : String(error)}`
}

// 获取当前用户 ID
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    return decoded.userId
  } catch (error) {
    return null
  }
}

// 保存消息到数据库
export async function saveMessage(role: 'user' | 'assistant', content: string, chatId: string): Promise<ActionResponse<{ id: string; role: string; content: string; createdAt: Date }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '未登录用户' }
    }

    // 验证聊天是否属于当前用户
    const chat = await db.chat.findUnique({
      where: { id: chatId, userId }
    })

    if (!chat) {
      return { success: false, error: '聊天记录不存在或无权限' }
    }

    const message = await db.message.create({
      data: {
        role,
        content,
        chatId
      }
    })

    // 更新聊天的最后更新时间
    await db.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() }
    })

    return { success: true, data: message }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}

// 批量保存消息（用于保存用户消息和AI回复）
export async function saveMessages(messages: Array<{ role: 'user' | 'assistant'; content: string }>, chatId: string): Promise<ActionResponse<null>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '未登录用户' }
    }

    // 验证聊天是否属于当前用户
    const chat = await db.chat.findUnique({
      where: { id: chatId, userId }
    })

    if (!chat) {
      return { success: false, error: '聊天记录不存在或无权限' }
    }

    // 使用事务批量插入消息
    await db.$transaction([
      ...messages.map((msg) =>
        db.message.create({
          data: {
            role: msg.role,
            content: msg.content,
            chatId
          }
        })
      ),
      db.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      })
    ])

    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}
