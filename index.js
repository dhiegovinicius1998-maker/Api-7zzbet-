const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const express = require('express');
const bcrypt = require('bcryptjs'); // pra criptografar
const jwt = require('jsonwebtoken'); // pra gerar token
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = 'chave-super-secreta-mude-isso'; // depois coloca no Railway

// MIDDLEWARE PRA PROTEGER ROTAS
function autenticar(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token não enviado' });
  
  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
}

// 1. CADASTRO COM SENHA CRIPTOGRAFADA
app.post('/cadastrar', async (req, res) => {
  const { nome, email, senha } = req.body;
  const senhaHash = await bcrypt.hash(senha, 10); // embaralha a senha

  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nome, email, senha: senhaHash }]); // salva o hash
    
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, message: 'Usuário cadastrado com sucesso' });
});

// 2. LOGIN RETORNA TOKEN
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const { data: usuario } = await supabase.from('usuarios').select('*').eq('email', email).single();

  if (!usuario) return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });

  const senhaOk = await bcrypt.compare(senha, usuario.senha); // compara hash
  if (!senhaOk) return res.status(401).json({ success: false, message: 'Email ou senha inválidos' });

  const token = jwt.sign({ id: usuario.id, email: usuario.email }, JWT_SECRET, { expiresIn: '7d' });
  
  res.json({ success: true, message: 'Login realizado', token });
});

// 3. LISTAR USUARIOS AGORA É PROTEGIDA
app.get('/usuarios', autenticar, async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('id, nome, email');
  if (error) return res.status(400).json({ success: false, error: error.message });
  res.json({ success: true, usuarios: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API rodando na porta ' + PORT));
