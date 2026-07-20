const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.get('/', (req, res) => {
  res.json({ message: 'API 7zzbet funcionando 🚀' });
});

// ROTA DE HEALTH CHECK
app.get('/health', async (req, res) => {
  const { data, error } = await supabase.from('users').select('count').limit(1);
  if (error) return res.status(500).json({ status: 'erro', supabase: error.message });
  res.json({ status: 'ok', supabase: 'conectado' });
});

// ROTA DE CADASTRO
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome ||!email ||!senha) {
    return res.status(400).json({ erro: 'Preencha nome, email e senha' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const { data, error } = await supabase
   .from('users')
   .insert([{ nome, email, senha: senhaHash }])
   .select();

  if (error) return res.status(400).json({ erro: error.message });

  res.status(201).json({ mensagem: 'Usuário criado com sucesso!', usuario: data[0] });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
