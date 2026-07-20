require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Conecta no Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Rota de teste
app.get('/health', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if(error) return res.json({ status: 'ok', supabase: 'erro: ' + error.message });
  res.json({ status: 'ok', supabase: 'conectado' });
});

app.get('/', (req, res) => {
  res.json({ message: 'API 7zzbet funcionando 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
