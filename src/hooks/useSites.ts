import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { deployToVercel } from '../lib/vercelDeploy'
import type { ThemePreference } from '../lib/themePreference'

export interface Site {
  id: string
  name: string
  markdown: string
  theme: string
  is_public: boolean
  slug: string | null
  created_at: string
  updated_at: string
  public_url: string | null
}

export function useSites() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null)

  // Загрузка списка сайтов
  useEffect(() => {
    if (!user) return
    loadSites()
  }, [user])

  async function loadSites() {
    setLoading(true)
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false })

    if (!error && data) {
      setSites(data)
    }
    setLoading(false)
  }

  // Создание нового сайта
  async function createSite(
    name: string,
    markdown: string,
    theme: ThemePreference = 'auto',
  ): Promise<{ data: Site | null; error: any }> {
    // Добавляем timestamp, чтобы slug ВСЕГДА был уникальным
    const baseSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '').slice(0, 40)
    const uniqueSlug = `${baseSlug}-${Date.now()}`
    
    const { data, error } = await supabase
      .from('sites')
      .insert({
        user_id: user!.id,
        name,
        markdown,
        theme,
        slug: uniqueSlug // <-- Вот это гарантирует отсутствие ошибки 409
      })
      .select()
      .single()

    if (!error && data) {
      setSites(prev => [data, ...prev])
      setCurrentSiteId(data.id)
    }
    
    return { data, error }
  }
  // Сохранение существующего сайта
async function saveSite(
  id: string,
  markdown: string,
  theme?: ThemePreference,
): Promise<{ error: any }> {
  const updatedAt = new Date().toISOString()
  const { error } = await supabase
    .from('sites')
    .update({
      markdown,
      ...(theme ? { theme } : {}),
      updated_at: updatedAt,
    })
    .eq('id', id)
    .eq('user_id', user!.id)

  if (!error) {
    setSites(prev => prev.map(s =>
      s.id === id ? { ...s, markdown, ...(theme ? { theme } : {}), updated_at: updatedAt } : s
    ))
  }

  return { error }
}

  // Удаление сайта
  async function deleteSite(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id)

    if (!error) {
      setSites(prev => prev.filter(s => s.id !== id))
      if (currentSiteId === id) {
        setCurrentSiteId(null)
      }
    }
    
    return { error }
  }
const currentSite = sites.find(s => s.id === currentSiteId) ?? null

  // Загрузка сайта по ID
  async function loadSite(id: string): Promise<Site | null> {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .eq('user_id', user!.id)
      .single()

    if (!error && data) {
      setCurrentSiteId(id)
      return data
    }
    return null
  }
async function publishSite(siteId: string, html: string): Promise<{ url: string | null; error: any }> {
  const site = sites.find(s => s.id === siteId)
  if (!site || !user) {
    return { url: null, error: new Error('Site or user not found') }
  }

  return await deployToVercel(html, siteId, site.name, user.id)
}

  return {
    sites,
    loading,
    currentSiteId,
    setCurrentSiteId,
    currentSite,
    createSite,
    saveSite,
    deleteSite,
    loadSite,
    refreshSites: loadSites,
    publishSite
  }
}