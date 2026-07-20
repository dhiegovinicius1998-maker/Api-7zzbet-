const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS LIBERADO PRA TUDO
app.use(cors()); 
app.use(express.json());

// CONFIGURA O SUPABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'chave-super-secreta-mude-isso';

// ROTA DE CADASTRO
app.post('/cadastrar', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email ||!password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
    .from('users')
    .insert([{ email, password: hashedPassword }])
    .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const token = jwt.sign({ userId: data[0].id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Usuário criado com sucesso', token, user: data[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'API rodando no Railway!' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
