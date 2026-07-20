const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', supabase: 'conectado' });
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API rodando na porta ' + PORT));
