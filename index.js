const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES - LIBERA ACESSO
app.use(cors({ origin: '*' })); // Libera qualquer site/app chamar a API
app.use(express.json());

// CONFIGURA O SUPABASE - ELE VAI PEGAR AS VARIAVEIS DO RAILWAY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'chave-super-secreta-mude-isso';

// ROTA DE CADASTRO
app.post('/cadastrar', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email ||!password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Criptografa a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Salva no Supabase
    const { data, error } = await supabase
     .from('users')
     .insert([{ email, password: hashedPassword, name }])
     .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Gera o token
    const token = jwt.sign({ userId: data[0].id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Usuário criado com sucesso', token, user: data[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({
