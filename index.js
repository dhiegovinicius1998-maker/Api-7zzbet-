const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// 1. ROTA HEALTH
app.get('/health', (req, res) => {
  res.json({ status: 'ok', supabase: 'conectado' });
});

// 2. ROTA CADASTRO
app.post('/cadastrar', async (req, res) => {
  const { nome, email, senha } = req.body;
  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nome, email, senha }]);
  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
  res.json({ success: true, message: 'Usuário cadastrado com sucesso' });
});

// 3. ROTA LOGIN - NOVA
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('senha', senha)
    .single();

  if (error || !data) {
    return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });
  }

  res.json({ success: true, message: 'Login realizado', usuario: data });
});

// 4. ROTA LISTAR USUARIOS - NOVA
app.get('/usuarios', async (req, res) => {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email'); // não vamos mostrar a senha

  if (error) {
    return res.status(400).json({ success: false, error: error.message });
  }

  res.json({ success: true, usuarios: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API rodando na porta ' + PORT));
