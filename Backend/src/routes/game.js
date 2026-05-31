import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

// Middleware para verificar token
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  const { data, error } = await supabase.auth.getUser(token)
  if (error) return res.status(401).json({ error: 'Token inválido' })

  req.user = data.user
  next()
}

// GET /api/game/profile
router.get('/profile', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('usuario')
    .select('*')
    .eq('idusuario', req.user.id)
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

// POST /api/game/click
router.post('/click', authMiddleware, async (req, res) => {
  // Obtener multiplicador activo (la magia de mayor multiplicador del usuario)
  const { data: magias } = await supabase
    .from('magias')
    .select('multiplicador')
    .eq('idusuario', req.user.id)
    .order('multiplicador', { ascending: false })
    .limit(1)

  const multiplicador = magias?.length ? magias[0].multiplicador : 1

  // Sumar clicks
  const { data: usuario } = await supabase
    .from('usuario')
    .select('clicks')
    .eq('idusuario', req.user.id)
    .single()

  const nuevosClicks = usuario.clicks + multiplicador

  const { data, error } = await supabase
    .from('usuario')
    .update({ clicks: nuevosClicks })
    .eq('idusuario', req.user.id)
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ clicks: data.clicks, multiplicador })
})

// POST /api/game/gacha — cuesta 100 clicks
router.post('/gacha', authMiddleware, async (req, res) => {
  const COSTO = 100

  // Verificar clicks suficientes
  const { data: usuario } = await supabase
    .from('usuario')
    .select('clicks')
    .eq('idusuario', req.user.id)
    .single()

  if (usuario.clicks < COSTO)
    return res.status(400).json({ error: 'No tenés suficientes clicks' })

  // Obtener todas las rarezas
  const { data: rarezas } = await supabase
    .from('rarezas')
    .select('*')

  // Lógica de drop (ajustá los porcentajes como quieras)
  const drops = [
    { idrarezas: rarezas.find(r => r.rareza === 'común')?.idrarezas,     chance: 0.60 },
    { idrarezas: rarezas.find(r => r.rareza === 'rara')?.idrarezas,      chance: 0.25 },
    { idrarezas: rarezas.find(r => r.rareza === 'épica')?.idrarezas,     chance: 0.12 },
    { idrarezas: rarezas.find(r => r.rareza === 'legendaria')?.idrarezas, chance: 0.03 },
  ]

  const rand = Math.random()
  let acum = 0
  let rarezaElegida = drops[0].idrarezas
  for (const drop of drops) {
    acum += drop.chance
    if (rand <= acum) { rarezaElegida = drop.idrarezas; break }
  }

  // Nombres de magia por rareza (podés expandir esto)
  const nombres = {
    común:      ['Chispa', 'Viento Leve', 'Gota'],
    rara:       ['Llama', 'Tormenta', 'Hielo'],
    épica:      ['Meteoro', 'Rayo Arcano', 'Abismo'],
    legendaria: ['Fénix', 'Apocalipsis', 'Éter Puro'],
  }
  const rareza = rarezas.find(r => r.idrarezas === rarezaElegida)?.rareza
  const listaNombres = nombres[rareza] || ['Magia Desconocida']
  const nombre = listaNombres[Math.floor(Math.random() * listaNombres.length)]

  const multiplicadores = { común: 2, rara: 5, épica: 10, legendaria: 25 }

  // Insertar magia
  const { data: magiaNueva, error: magiaError } = await supabase
    .from('magias')
    .insert({
      nombre,
      multiplicador: multiplicadores[rareza] || 1,
      idusuario: req.user.id,
      idrarezas: rarezaElegida
    })
    .select()
    .single()

  if (magiaError) return res.status(400).json({ error: magiaError.message })

  // Descontar clicks
  await supabase
    .from('usuario')
    .update({ clicks: usuario.clicks - COSTO })
    .eq('idusuario', req.user.id)

  res.json({ magia: magiaNueva, rareza, clicksRestantes: usuario.clicks - COSTO })
})

// GET /api/game/magias — magias del usuario
router.get('/magias', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('magias')
    .select('*, rarezas(rareza)')
    .eq('idusuario', req.user.id)
    .order('multiplicador', { ascending: false })

  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

export default router