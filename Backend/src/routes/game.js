import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { supabase } from '../supabase.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar'

const PROB_RAREZA = { 1: 0.60, 2: 0.25, 3: 0.10, 4: 0.05 }
const NOMBRE_RAREZA = { 1: 'Común', 2: 'Raro', 3: 'Épico', 4: 'Legendario' }

function elegirPorRareza(magias) {
  const porRareza = {}
  for (const m of magias) {
    (porRareza[m.rareza_id] ||= []).push(m)
  }
  const rarezasDisp = Object.keys(porRareza).map(Number)
  const pesoTotal = rarezasDisp.reduce((s, r) => s + (PROB_RAREZA[r] || 0), 0)

  if (pesoTotal <= 0) {
    return magias[Math.floor(Math.random() * magias.length)]
  }

  let rand = Math.random() * pesoTotal
  let rarezaElegida = rarezasDisp[0]
  for (const r of rarezasDisp) {
    rand -= (PROB_RAREZA[r] || 0)
    if (rand <= 0) { rarezaElegida = r; break }
  }

  const grupo = porRareza[rarezaElegida]
  return grupo[Math.floor(Math.random() * grupo.length)]
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = { id: payload.id }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
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

router.put('/clicks', authMiddleware, async (req, res) => {
  const { clicks } = req.body
  const valor = Math.floor(Number(clicks))

  if (!Number.isFinite(valor) || valor < 0)
    return res.status(400).json({ error: 'clicks inválido' })

  const { data, error } = await supabase
    .from('usuario')
    .update({ clicks: valor })
    .eq('idusuario', req.user.id)
    .select('clicks')
    .single()

  if (error) return res.status(400).json({ error: error.message })
  res.json({ clicks: data.clicks })
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

// POST /api/game/invocar
router.post('/invocar', authMiddleware, async (req, res) => {
  try {
    const { data: catalogo, error: catErr } = await supabase
      .from('Magias')
      .select('id_magias, nombre, multiplicador, rareza_id')

    if (catErr) return res.status(400).json({ error: catErr.message })

    console.log('[invocar] catálogo Magias:', catalogo?.length ?? 0, 'filas')

    if (!catalogo || !catalogo.length)
      return res.status(400).json({ error: 'El catálogo de magias está vacío o no es accesible (revisá datos/RLS de la tabla Magias)' })

    const { data: poseidas, error: posErr } = await supabase
      .from('magiasUsuario')
      .select('id_magias')
      .eq('idusuario', req.user.id)

    if (posErr) return res.status(400).json({ error: posErr.message })

    console.log('[invocar] magias del usuario:', poseidas?.length ?? 0)

    const idsPoseidas = new Set((poseidas || []).map(p => p.id_magias))
    const disponibles = catalogo.filter(m => !idsPoseidas.has(m.id_magias))

    if (!disponibles.length)
      return res.status(400).json({ error: 'Ya tenés todas las magias del catálogo' })

    const elegida = elegirPorRareza(disponibles)

    const { error: insErr } = await supabase
      .from('magiasUsuario')
      .insert({ id_magias: elegida.id_magias, idusuario: req.user.id })

    if (insErr) return res.status(400).json({ error: insErr.message })

    res.json({
      magia: {
        id_magias: elegida.id_magias,
        nombre: elegida.nombre,
        multiplicador: elegida.multiplicador,
        rareza_id: elegida.rareza_id,
        rareza: NOMBRE_RAREZA[elegida.rareza_id] || 'Desconocida'
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/game/magias — magias del usuario
router.get('/magias', authMiddleware, async (req, res) => {
  try {
    const { data: poseidas, error: posErr } = await supabase
      .from('magiasUsuario')
      .select('id_magias')
      .eq('idusuario', req.user.id)

    if (posErr) return res.status(400).json({ error: posErr.message })
    if (!poseidas || !poseidas.length) return res.json([])

    const ids = poseidas.map(p => p.id_magias)
    const { data: catalogo, error: catErr } = await supabase
      .from('Magias')
      .select('id_magias, nombre, multiplicador, rareza_id')
      .in('id_magias', ids)

    if (catErr) return res.status(400).json({ error: catErr.message })

    const resultado = (catalogo || []).map(m => ({
      id_magias: m.id_magias,
      nombre: m.nombre,
      multiplicador: m.multiplicador,
      rareza_id: m.rareza_id,
      rareza: NOMBRE_RAREZA[m.rareza_id] || 'Desconocida'
    }))

    res.json(resultado)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router