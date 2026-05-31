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
  try {
    console.log('Login body:', req.body)
    const { mail, contraseña } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({
      email: mail,
      password: contraseña
    })

    console.log('Supabase signIn result:', { data, error })
    if (error) {
      console.error('Login error:', error.message)
      return res.status(401).json({ error: error.message })
    }

    if (!data || !data.session) {
      console.error('Login failed: no session returned')
      return res.status(500).json({ error: 'No session returned from auth provider' })
    }

    res.json({ token: data.session.access_token, usuario: data.user })
  } catch (err) {
    console.error('Unexpected login error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// Debug: verificar si usuario existe en la tabla usuario
router.get('/debug/:email', async (req, res) => {
  try {
    const { email } = req.params
    console.log(`Debug: buscando usuario con email: ${email}`)

    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('mail', email)

    if (error) {
      console.error('Debug query error:', error)
      return res.status(500).json({ error: error.message })
    }

    console.log(`Debug: resultado:`, data)
    res.json({ existe: data.length > 0, usuarios: data })
  } catch (err) {
    console.error('Debug error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router