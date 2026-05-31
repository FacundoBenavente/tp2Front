import { Router } from 'express'
import { supabase } from '../supabase.js'

const router = Router()

router.post('/register', async (req, res) => {
  console.log('Body recibido:', req.body)
  const { nombre, mail, password } = req.body
  console.log('Password:', password)

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: mail,
    password: password
  })
  if (authError) return res.status(400).json({ error: authError.message })

  // 2. Crear fila en tabla usuario
  const { error: dbError } = await supabase
    .from('usuario')
    .insert({ idusuario: authData.user.id, nombre, mail, clicks: 0 })

  if (dbError) return res.status(400).json({ error: dbError.message })

  res.json({ mensaje: 'Usuario creado' })
})

router.post('/login', async (req, res) => {
  const { mail, contraseña } = req.body

  const { data, error } = await supabase.auth.signInWithPassword({
    email: mail,
    password: contraseña
  })
  if (error) return res.status(401).json({ error: error.message })

  res.json({ token: data.session.access_token, usuario: data.user })
})

export default router