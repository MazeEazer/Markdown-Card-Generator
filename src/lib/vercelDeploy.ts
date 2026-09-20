// src/lib/vercelDeploy.ts

interface DeployResult {
  url: string | null
  error: any
}

export async function deployToVercel(
  html: string,
  siteId: string
): Promise<DeployResult> {
  const token = import.meta.env.VITE_VERCEL_TOKEN
  const teamId = import.meta.env.VITE_VERCEL_TEAM_ID

  if (!token) {
    return { url: null, error: new Error('Vercel token not configured') }
  }

  const shortId = siteId.replace(/-/g, '').slice(0, 8)
  const projectName = `md-card-${shortId}`

  console.log('📤 Деплой на Vercel...', projectName)

  try {
    // 1. Проверяем или создаём проект
    const checkRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectName}${teamId ? `?teamId=${teamId}` : ''}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    let projectId: string
    let projectUrl: string

    if (checkRes.ok) {
      const existingProject = await checkRes.json()
      projectId = existingProject.id
      // 🔥 Берём URL проекта (стабильный)
      projectUrl = existingProject.name + '.vercel.app'
      console.log('✅ Проект найден, ID:', projectId, 'URL:', projectUrl)
    } else {
      const createRes = await fetch(
        `https://api.vercel.com/v9/projects${teamId ? `?teamId=${teamId}` : ''}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            framework: null,
          }),
        }
      )

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error?.message || 'Failed to create project')
      }

      const newProject = await createRes.json()
      projectId = newProject.id
      projectUrl = newProject.name + '.vercel.app'
      console.log('✅ Проект создан, ID:', projectId, 'URL:', projectUrl)
    }

    // 2. Деплой в production
    const deployBody = {
      name: projectName,
      project: projectId,
      target: 'production',
      files: [{ file: 'index.html', data: html }],
    }

    const deployRes = await fetch(
      `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ''}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deployBody),
      }
    )

    const deployData = await deployRes.json()

    if (!deployRes.ok) {
      console.error('❌ Deploy error:', deployData)
      throw new Error(deployData.error?.message || 'Deploy failed')
    }

    const deploymentId = deployData.uid || deployData.id
    console.log(' Deployment created, ID:', deploymentId)

    // 3. Ждём готовности
    console.log('⏳ Ожидаем готовности деплоя...')
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const statusRes = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}${teamId ? `?teamId=${teamId}` : ''}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      const statusData = await statusRes.json()

      if (statusData.readyState === 'READY') {
        console.log('✅ Deployment ready')
        break
      }
      if (statusData.readyState === 'ERROR') {
        console.error('❌ Deployment error:', statusData)
        throw new Error('Deployment failed')
      }
    }

    // 🔥 Используем стабильный URL проекта
    const finalUrl = `https://${projectUrl}`
    console.log('✅ Финальный URL:', finalUrl)

    // Сохраняем локально
    const sites = JSON.parse(localStorage.getItem('md-card-sites') || '[]')
    const updatedSites = sites.map((site: any) => 
      site.id === siteId ? { ...site, public_url: finalUrl } : site
    )
    localStorage.setItem('md-card-sites', JSON.stringify(updatedSites))

    return { url: finalUrl, error: null }
  } catch (error) {
    console.error('❌ Vercel deployment error:', error)
    return { url: null, error }
  }
}