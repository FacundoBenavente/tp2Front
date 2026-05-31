import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { supabase } from '../supabase.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-cambiar'

router.post('/register', async (req, res) => {
  try {
    const { nombre, mail, password } = req.body
    if (!nombre || !mail || !password)
      return res.status(400).json({ error: 'Faltan datos (nombre, mail, password)' })

    // Verificar que el mail no esté ya registrado
    const { data: existente } = await supabase
      .from('usuario')
      .select('idusuario')
      .eq('mail', mail)
      .maybeSingle()

    if (existente)
      return res.status(400).json({ error: 'El correo ya está registrado' })

    // Hashear la contraseña antes de guardarla
    const hash = await bcrypt.hash(password, 10)

    const { error: dbError } = await supabase
      .from('usuario')
      .insert({ idusuario: randomUUID(), nombre, mail, contraseña: hash, clicks: 0 })

    if (dbError) return res.status(400).json({ error: dbError.message })

    res.json({ mensaje: 'Usuario creado' })
  } catch (err) {
    console.error('Error en register:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { mail, contraseña } = req.body
    if (!mail || !contraseña)
      return res.status(400).json({ error: 'Faltan datos (mail, contraseña)' })

    // Buscar el usuario directamente en la tabla
    const { data: usuario, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('mail', mail)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    if (!usuario) return res.status(401).json({ error: 'Credenciales inválidas' })

    // Comparar la contraseña ingresada contra el hash almacenado
    const valido = await bcrypt.compare(contraseña, usuario.contraseña || '')
    if (!valido) return res.status(401).json({ error: 'Credenciales inválidas' })

    // Generar un JWT propio
    const token = jwt.sign({ id: usuario.idusuario }, JWT_SECRET, { expiresIn: '7d' })

    // Nunca devolver el hash al cliente (se renombra para no chocar con el body)
    const { contraseña: _hash, ...usuarioSinPass } = usuario
    res.json({ token, usuario: usuarioSinPass })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// Debug: verificar si usuario existe en la tabla usuario
router.get('/debug/:email', async (req, res) => {
  try {
    const { email } = req.params
    const { data, error } = await supabase
      .from('usuario')
      .select('idusuario, nombre, mail, clicks')
      .eq('mail', email)

    if (error) return res.status(500).json({ error: error.message })
    res.json({ existe: data.length > 0, usuarios: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
