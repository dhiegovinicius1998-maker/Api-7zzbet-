const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); 
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'chave-super-secreta-mude-isso';


// ROTA 1: CADASTRAR
app.post('/cadastrar', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email ||!password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nome = email.split('@')[0];

    const { data, error } = await supabase
    .from('users')
    .insert([{ 
        email, 
        senha: hashedPassword,
        nome: nome 
      }])
    .select();

    if (error) {
      if(error.code === '23505'){
        return res.status(400).json({ error: 'Este email já está cadastrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    const token = jwt.sign({ userId: data[0].id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ message: 'Usuário criado com sucesso', token, user: data[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


// ROTA 2: LOGIN
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email ||!password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

    if (error ||!users) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const isPasswordValid = await bcrypt.compare(password, users.senha);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const token = jwt.sign({ userId: users.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ 
      message: 'Login realizado com sucesso', 
      token, 
      user: { id: users.id, email: users.email, nome: users.nome } 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});


// ROTA TESTE
app.get('/', (req, res) => {
  res.json({ message: 'API rodando no Railway!' });
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
