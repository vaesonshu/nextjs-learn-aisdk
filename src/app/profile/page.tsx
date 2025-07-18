'use client'

import type React from 'react'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeftIcon, LoaderIcon } from 'lucide-react'
import { getCurrentUser, updateUser } from '@/actions/auth-actions'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; email: string; name: string | null } | null>(null)
  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const result = await getCurrentUser()
    if (result.success && result.data) {
      setUser(result.data)
      setName(result.data.name || '')
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword && newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    startTransition(async () => {
      const result = await updateUser(name, currentPassword || undefined, newPassword || undefined)

      if (result.success) {
        toast.success('个人资料更新成功')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setUser(result.data)
      } else {
        setError(result.error)
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>用户信息加载失败</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              返回聊天
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">个人资料</h1>
          <p className="text-gray-600 mt-2">管理您的账户信息和密码</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>账户信息</CardTitle>
            <CardDescription>更新您的个人信息和密码</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" type="email" value={user.email} disabled className="bg-gray-100" />
                <p className="text-xs text-gray-500">邮箱地址无法修改</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">姓名</Label>
                <Input id="name" type="text" placeholder="您的姓名" value={name} onChange={(e) => setName(e.target.value)} disabled={isPending} />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">修改密码</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">当前密码</Label>
                    <Input id="currentPassword" type="password" placeholder="输入当前密码" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isPending} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">新密码</Label>
                    <Input id="newPassword" type="password" placeholder="输入新密码（至少6位）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isPending} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">确认新密码</Label>
                    <Input id="confirmPassword" type="password" placeholder="再次输入新密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isPending} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存更改'
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  )
}
