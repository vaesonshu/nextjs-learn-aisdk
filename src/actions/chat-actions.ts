'use server'

// 导入 Prisma 客户端，用于数据库操作
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
        return `Prisma 错误: ${error.message}`
    }
  }
  return `未知错误: ${error instanceof Error ? error.message : String(error)}`
}

// 获取当前用户 ID（从 JWT）
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

// 获取当前用户的聊天列表
export async function getUserChats(): Promise<ActionResponse<{ id: string; title: string; model: string }[]>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '未登录用户' }
    }

    const chats = await db.chat.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        model: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: chats }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}

// 获取指定 ID 的聊天记录
export async function getChat(id: string): Promise<ActionResponse<{ id: string; title: string; model: string; messages: any[] }>> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '未登录用户' }
    }
    // 查询数据库，获取指定 ID 的聊天及其相关消息，按创建时间升序排列
    const chat = await db.chat.findUnique({
      where: { id, userId }, // 确保只获取当前用户的聊天
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    // 如果未找到聊天记录，返回失败信息
    if (!chat) {
      return { success: false, error: '未找到聊天记录' }
    }

    // 返回成功状态和聊天数据
    return { success: true, data: chat }
  } catch (error) {
    // 捕获错误并返回失败信息
    return { success: false, error: handlePrismaError(error) }
  }
}

// 删除指定 ID 的聊天记录
export async function deleteChat(id: string): Promise<ActionResponse<null>> {
  try {
    // 从数据库中删除指定 ID 的聊天
    await db.chat.delete({
      where: { id }
    })
    // 返回成功状态
    return { success: true, data: null }
  } catch (error) {
    // 捕获错误并返回失败信息
    return { success: false, error: handlePrismaError(error) }
  }
}

// 创建新的聊天记录
export async function createChat(userId: string, title: string, model: string): Promise<ActionResponse<{ id: string; title: string; model: string }>> {

  try {
    // 在数据库中创建新的聊天记录
    const chat = await db.chat.create({
      data: {
        userId,
        title,
        model
      }
    })
    // 返回成功状态和新创建的聊天数据
    return { success: true, data: chat }
  } catch (error) {
    // 捕获错误并返回失败信息
    return { success: false, error: handlePrismaError(error) }
  }
}

// 更新指定 ID 的聊天记录
export async function updateChat(id: string, title: string, model?: string): Promise<ActionResponse<{ id: string; title: string; model: string }>> {
  try {
    // 在数据库中更新指定 ID 的聊天记录
    const chat = await db.chat.update({
      where: { id },
      data: {
        title,
        model
      }
    })
    // 返回成功状态和更新后的聊天数据
    return { success: true, data: chat }
  } catch (error) {
    // 捕获错误并返回失败信息
    return { success: false, error: handlePrismaError(error) }
  }
}
