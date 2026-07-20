require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const DB = new sqlite3.Database('./7zzbet.db');
const API_URL = process.env.API_URL || 'http://localhost:3000';

// DADOS DO SEU MEI
const DADOS_EMPRESA = {
  razaoSocial: "Dhiego Vinicius de Sousa Costa",
  cnpj: "50.659.121/0001-18",
  nomeFantasia: "7ZZBET"
}

// BANCO DE DADOS
DB.serialize(() => {
  DB.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, cpf TEXT UNIQUE, nome TEXT, telefone TEXT, senha TEXT, saldo REAL DEFAULT 0, indicado_por TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  DB.run(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id INTEGER, tipo TEXT, valor REAL, status TEXT, gateway_id TEXT, pix_code TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

// LOGIN ADM FIXO
const ADM = { cpf: '00000', senha: 'adm123' };

// ROTAS DE USUARIO
app.post('/api/register', (req,res) => {
  const {cpf,nome,telefone,senha,indicado_por} = req.body;
  DB.run(`INSERT INTO users (cpf,nome,telefone,senha,indicado_por) VALUES (?,?,?,?,?)`, [cpf,nome,telefone,senha,indicado_por], function(err){
    if(err) return res.status(400).json({error: "CPF já cadastrado"});
    res.json({success: true, userId: this.lastID});
  });
});

app.post('/api/login', (req,res) => {
  const {cpf,senha} = req.body;
  if(cpf === ADM.cpf && senha === ADM.senha) return res.json({success:true, isAdmin: true});
  DB.get(`SELECT * FROM users WHERE cpf = ? AND senha = ?`, [cpf,senha], (err,row) => {
    if(!row) return res.status(401).json({error: "CPF ou senha inválidos"});
    res.json({success:true, user: row});
  });
});

// CRIAR DEPOSITO PIX VIA EZZEPAY
app.post('/api/deposit', async (req,res) => {
  const {userId, valor} = req.body;
  const transactionId = uuidv4();
  
  try {
    // AQUI ENTRA A INTEGRAÇÃO REAL COM EZZEPAY
    const ezzepayResponse = await axios.post('https://api.ezzepay.com/v1/pix/qrcode', {
      amount: valor,
      external_id: transactionId,
      payer_name: DADOS_EMPRESA.razaoSocial
    }, {
      headers: { 'Authorization': `Bearer ${process.env.EZZEPAY_CLIENT_SECRET}` }
    });

    DB.run(`INSERT INTO transactions (id, user_id, tipo, valor, status, gateway_id, pix_code) VALUES (?,?,?,?,?,?,?)`,
      [transactionId, userId, 'DEPOSITO', valor, 'PENDENTE', ezzepayResponse.data.id, ezzepayResponse.data.pix_qrcode]
    );
    
    res.json({success:true, pixCode: ezzepayResponse.data.pix_qrcode, transactionId});
  } catch(e) {
    res.status(500).json({error: "Erro ao gerar Pix"});
  }
});

// WEBHOOK EZZEPAY - CONFIRMA PAGAMENTO AUTOMATICO
app.post('/api/webhook/pix', (req,res) => {
  const {external_id, status} = req.body;
  
  if(status === 'PAID') {
    DB.get(`SELECT * FROM transactions WHERE id = ?`, [external_id], (err, tx) => {
      if(tx && tx.status === 'PENDENTE') {
        DB.run(`UPDATE transactions SET status = 'APROVADO' WHERE id = ?`, [external_id]);
        DB.run(`UPDATE users SET saldo = saldo + ? WHERE id = ?`, [tx.valor, tx.user_id]);
      }
    });
  }
  res.sendStatus(200);
});

// SOLICITAR SAQUE
app.post('/api/withdraw', (req,res) => {
  const {userId, valor, chave_pix} = req.body;
  DB.get(`SELECT saldo FROM users WHERE id = ?`, [userId], (err,user) => {
    if(user.saldo < valor) return res.status(400).json({error: "Saldo insuficiente"});
    const transactionId = uuidv4();
    DB.run(`UPDATE users SET saldo = saldo - ? WHERE id = ?`, [valor, userId]);
    DB.run(`INSERT INTO transactions (id, user_id, tipo, valor, status) VALUES (?,?,?,?,?)`,
      [transactionId, userId, 'SAQUE', valor, 'PENDENTE']
    );
    res.json({success:true, message: "Saque solicitado. Aguarde aprovação do ADM."});
  });
});

// ROTAS ADM
app.get('/api/admin/users', (req,res) => {
  DB.all(`SELECT * FROM users ORDER BY id DESC`, [], (err,rows) => res.json(rows));
});

app.get('/api/admin/transactions', (req,res) => {
  DB.all(`SELECT * FROM transactions ORDER BY created_at DESC`, [], (err,rows) => res.json(rows));
});

app.post('/api/admin/approve-withdraw', (req,res) => {
  const {transactionId} = req.body;
  DB.run(`UPDATE transactions SET status = 'APROVADO' WHERE id = ?`, [transactionId]);
  res.json({success:true});
});

app.listen(process.env.PORT || 3000, () => console.log(`API 7ZZBET MEI ${DADOS_EMPRESA.razaoSocial} rodando`));
