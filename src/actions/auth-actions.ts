'use server'

import { db } from '@/db/db'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

// 定义通用响应类型
type ActionResponse<T> = { success: true; data: T } | { success: false; error: string }

// 错误处理函数
function handlePrismaError(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return '该邮箱已被注册'
      case 'P2025':
        return '用户不存在'
      default:
        return `数据库错误: ${error.message}`
    }
  }
  return `未知错误: ${error instanceof Error ? error.message : String(error)}`
}

// 验证邮箱格式
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证密码强度
function isValidPassword(password: string): boolean {
  return password.length >= 6
}

// 用户注册
export async function registerUser(email: string, password: string, name?: string): Promise<ActionResponse<{ id: string; email: string; name: string | null }>> {
  try {
    // 验证输入
    if (!email || !password) {
      return { success: false, error: '邮箱和密码不能为空' }
    }

    if (!isValidEmail(email)) {
      return { success: false, error: '邮箱格式不正确' }
    }

    if (!isValidPassword(password)) {
      return { success: false, error: '密码至少需要6位字符' }
    }

    // 检查邮箱是否已存在
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: '该邮箱已被注册' }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户
    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name: name || null
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return { success: true, data: user }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}

// 用户登录
export async function loginUser(email: string, password: string): Promise<ActionResponse<{ id: string; email: string; name: string | null }>> {
  try {
    // 验证输入
    if (!email || !password) {
      return { success: false, error: '邮箱和密码不能为空' }
    }

    if (!isValidEmail(email)) {
      return { success: false, error: '邮箱格式不正确' }
    }

    // 查找用户
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      return { success: false, error: '邮箱或密码错误' }
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      return { success: false, error: '邮箱或密码错误' }
    }

    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: '7d'
    })

    // 设置cookie
    const cookieStore = await cookies()
    console.log('token', token)
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7天
    })

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}

// 用户登出
export async function logoutUser(): Promise<ActionResponse<null>> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('token')
    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: '登出失败' }
  }
}

// 获取当前用户信息
export async function getCurrentUser(): Promise<ActionResponse<{ id: string; email: string; name: string | null } | null>> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return { success: true, data: null }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    return { success: true, data: user }
  } catch (error) {
    return { success: true, data: null }
  }
}

// 更新用户信息
export async function updateUser(name: string, currentPassword?: string, newPassword?: string): Promise<ActionResponse<{ id: string; email: string; name: string | null }>> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return { success: false, error: '未登录用户' }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    const user = await db.user.findUnique({
      where: { id: decoded.userId }
    })

    console.log('user', user)

    if (!user) {
      return { success: false, error: '用户不存在' }
    }

    // 如果要更新密码，验证当前密码
    if (newPassword) {
      if (!currentPassword) {
        return { success: false, error: '请输入当前密码' }
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isCurrentPasswordValid) {
        return { success: false, error: '当前密码错误' }
      }

      if (!isValidPassword(newPassword)) {
        return { success: false, error: '新密码至少需要6位字符' }
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 12)

      const updatedUser = await db.user.update({
        where: { id: decoded.userId },
        data: {
          name,
          passwordHash: hashedNewPassword
        },
        select: {
          id: true,
          email: true,
          name: true
        }
      })

      return { success: true, data: updatedUser }
    } else {
      // 只更新姓名
      const updatedUser = await db.user.update({
        where: { id: decoded.userId },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true
        }
      })

      return { success: true, data: updatedUser }
    }
  } catch (error) {
    return { success: false, error: handlePrismaError(error) }
  }
}
