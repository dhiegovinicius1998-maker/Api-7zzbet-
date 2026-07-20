const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cors({ origin: '*' }));

// CONFIGURA O SUPABASE - ELE VAI PEGAR AS VARIAVEIS DO RAILWAY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const JWT_SECRET = 'chave-super-secreta-mude-isso';

// MIDDLEWARE PRA PROTEGER ROTAS
function autenticar(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Token não fornecido' });

    jwt.verify(token, JWT_SECRET, (err, usuario) => {
        if (err) return res.status(403).json({ message: 'Token inválido' });
        req.usuario = usuario;
        next();
    });
}

// 1. ROTA DE CADASTRO
app.post('/cadastrar', async (req, res) => {
    const { nome, email, senha } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
        .from('usuarios')
        .insert([{ nome, email, senha: senhaHash }]);

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
});

// 2. ROTA DE LOGIN
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !usuario) return res.status(401).json({ message: 'Usuário não encontrado' });

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) return res.status(401).json({ message: 'Senha incorreta' });

    const token = jwt.sign({ id: usuario.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

// 3. ROTA TESTE PROTEGIDA
app.get('/perfil', autenticar, (req, res) => {
    res.json({ message: 'Você está logado!', usuario: req.usuario });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
