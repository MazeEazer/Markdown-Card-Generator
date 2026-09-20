import { supabase } from './supabase'

interface PublishResult {
  url: string | null
  error: any
}

export async function publishToSupabase(
  html: string,
  siteId: string,
  userId: string
): Promise<PublishResult> {
  const filePath = `${userId}/${siteId}/index.html`

  console.log('📤 Публикация сайта...', filePath)

  try {
    // Удаляем старый файл
    await supabase.storage.from('sites').remove([filePath]).catch(() => {})

    // Загружаем HTML в Storage
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })

    const { error: uploadError } = await supabase.storage
      .from('sites')
      .upload(filePath, blob, {
        upsert: true,
        contentType: 'text/html;charset=utf-8',
        cacheControl: '3600',
      })

    if (uploadError) {
      console.error('❌ Ошибка загрузки:', uploadError)
      throw uploadError
    }

    console.log('✅ Файл загружен в Storage')

    // Формируем прямую публичную ссылку на файл в Storage
    const { data: publicUrlData } = supabase.storage
      .from('sites')
      .getPublicUrl(filePath)

    const publicUrl = publicUrlData.publicUrl
    console.log('✅ Публичная ссылка:', publicUrl)

    // Сохраняем URL в БД
    const { error: dbError } = await supabase
      .from('sites')
      .update({ public_url: publicUrl })
      .eq('id', siteId)
      .eq('user_id', userId)

    if (dbError) {
      console.error('❌ Ошибка сохранения в БД:', dbError)
    } else {
      console.log('✅ URL сохранён в БД')
    }

    return { url: publicUrl, error: dbError }
  } catch (error) {
    console.error('❌ Ошибка публикации:', error)
    return { url: null, error }
  }
}

export async function unpublishFromSupabase(
  siteId: string,
  userId: string
): Promise<{ success: boolean; error: any }> {
  const filePath = `${userId}/${siteId}/index.html`

  try {
    const { error: deleteError } = await supabase.storage
      .from('sites')
      .remove([filePath])

    if (deleteError) throw deleteError

    const { error: dbError } = await supabase
      .from('sites')
      .update({ public_url: null })
      .eq('id', siteId)
      .eq('user_id', userId)

    if (dbError) throw dbError

    return { success: true, error: null }
  } catch (error) {
    console.error('❌ Ошибка снятия с публикации:', error)
    return { success: false, error }
  }
}