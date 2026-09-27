const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "metati-admin-2026";
const JWT_SECRET = process.env.JWT_SECRET || "meta-ti-secret-change-me";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------------------------------
   BANCO DE DADOS
   --------------------------------------------------------- */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "meta-ti.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS concursos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    ordem INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS disciplinas (
    id TEXT PRIMARY KEY,
    concurso_id TEXT NOT NULL,
    nome TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topicos (
    id TEXT PRIMARY KEY,
    disciplina_id TEXT NOT NULL,
    texto TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    nome TEXT DEFAULT '',
    status TEXT DEFAULT 'pendente',
    criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
    aprovado_em TEXT
  );

  CREATE TABLE IF NOT EXISTS permissoes (
    usuario_id TEXT NOT NULL,
    concurso_id TEXT NOT NULL,
    PRIMARY KEY (usuario_id, concurso_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (concurso_id) REFERENCES concursos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progresso (
    usuario_id TEXT NOT NULL,
    concurso_id TEXT NOT NULL,
    topico_id TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    grade INTEGER,
    PRIMARY KEY (usuario_id, concurso_id, topico_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
  );
`);

// Migração: se tabela usuarios existir sem a coluna status, adiciona
try {
  const cols = db.prepare("PRAGMA table_info(usuarios)").all();
  const hasStatus = cols.some(function(c){ return c.name === "status"; });
  if (!hasStatus) {
    db.exec("ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'aprovado'");
    db.exec("ALTER TABLE usuarios ADD COLUMN aprovado_em TEXT");
    console.log("Migracao: colunas status e aprovado_em adicionadas.");
  }
} catch(e){
  console.log("Migracao skip:", e.message);
}

/* ---------------------------------------------------------
   SEED
   --------------------------------------------------------- */
function seed(){
  const count = db.prepare("SELECT COUNT(*) AS n FROM concursos").get().n;
  if(count > 0) return;

  const concursos = [
    { id: "pf", nome: "Policia Federal - Agente (TI)",
      descricao: "Edital PF Agente de Policia - area de TI",
      disciplinas: [
        { nome:"INFRAESTRUTURA DE TI", topicos:[
          "Conceitos de rede: LAN, WAN, VPN",
          "Enderecamento IPv4 e IPv6",
          "Servicos: DNS, DHCP, HTTP, HTTPS, FTP",
          "Virtualizacao e containers",
          "Backup, restore e continuidade de negocios"
        ]},
        { nome:"SEGURANCA CIBERNETICA", topicos:[
          "Criptografia simetrica e assimetrica",
          "Certificacao digital e ICP-Brasil",
          "Ataques ciberneticos e mitigacao",
          "Gestao de identidades e acessos",
          "Normas e boas praticas (ISO 27001, NIST)"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem de dados relacional",
          "SQL: DDL, DML, DQL e DCL",
          "Normalizacao (1FN, 2FN, 3FN)",
          "Indices, views e procedures",
          "Tuning e otimizacao de consultas"
        ]},
        { nome:"DESENVOLVIMENTO DE SISTEMAS", topicos:[
          "Logica de programacao e algoritmos",
          "Estruturas de dados",
          "Programacao orientada a objetos",
          "Metodologias ageis (Scrum, Kanban)",
          "APIs REST e integracao de sistemas"
        ]},
        { nome:"SISTEMAS OPERACIONAIS", topicos:[
          "Linux: comandos, permissoes e processos",
          "Windows Server: AD, DNS e GPO",
          "Gerenciamento de usuarios e grupos",
          "Shell script e automacao",
          "Monitoramento e logs"
        ]},
        { nome:"COMPUTACAO FORENSE", topicos:[
          "Cadeia de custodia",
          "Coleta e preservacao de evidencias digitais",
          "Analise de dispositivos moveis",
          "Ferramentas forenses",
          "Legislacao aplicada (Marco Civil, LGPD)"
        ]}
      ]
    },
    { id: "prf", nome: "PRF - Policial Rodoviario Federal (TI)",
      descricao: "Edital PRF - area de Tecnologia da Informacao",
      disciplinas: [
        { nome:"INFORMATICA BASICA E AVANCADA", topicos:[
          "Sistemas operacionais Windows e Linux",
          "Pacote Office e LibreOffice",
          "Redes de computadores e internet",
          "Seguranca da informacao",
          "Computacao em nuvem"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem relacional",
          "SQL: consultas e manipulacao",
          "Normalizacao",
          "Transacoes e ACID",
          "NoSQL"
        ]},
        { nome:"DESENVOLVIMENTO DE SISTEMAS", topicos:[
          "Logica de programacao",
          "Programacao orientada a objetos",
          "Estruturas de dados",
          "APIs e integracao",
          "Metodologias ageis"
        ]},
        { nome:"INFRAESTRUTURA E REDES", topicos:[
          "Modelo OSI e TCP/IP",
          "Roteamento e switching",
          "Redes sem fio",
          "Virtualizacao",
          "Cloud computing"
        ]},
        { nome:"SEGURANCA DA INFORMACAO", topicos:[
          "Criptografia",
          "Certificacao digital",
          "Ataques e mitigacao",
          "LGPD",
          "Gestao de incidentes"
        ]}
      ]
    },
    { id: "bacen", nome: "BACEN - Analista (TI)",
      descricao: "Edital BACEN - Analista do Banco Central - Tecnologia da Informacao",
      disciplinas: [
        { nome:"INFRAESTRUTURA DE TI", topicos:[
          "Redes: modelo OSI, TCP/IP, roteamento",
          "Sistemas operacionais Linux e Windows",
          "Virtualizacao e containers",
          "Cloud computing (IaaS, PaaS, SaaS)",
          "Monitoramento e observabilidade"
        ]},
        { nome:"SEGURANCA DA INFORMACAO", topicos:[
          "ISO 27001 e 27002",
          "Criptografia aplicada",
          "Gestao de riscos",
          "Seguranca em nuvem",
          "Resposta a incidentes"
        ]},
        { nome:"BANCO DE DADOS E BIG DATA", topicos:[
          "Modelagem relacional e dimensional",
          "SQL avancado",
          "NoSQL e bancos distribuidos",
          "Data warehouse e ETL",
          "Big data e analytics"
        ]},
        { nome:"ENGENHARIA DE SOFTWARE", topicos:[
          "Ciclo de vida de software",
          "Metodologias ageis e DevOps",
          "Arquitetura de software",
          "Testes e qualidade",
          "CI/CD"
        ]},
        { nome:"GOVERNANCA E GESTAO DE TI", topicos:[
          "COBIT 2019",
          "ITIL 4",
          "PMBOK",
          "Contratacoes de TI",
          "LGPD"
        ]},
        { nome:"CIENCIA DE DADOS E IA", topicos:[
          "Estatistica e probabilidade",
          "Machine learning",
          "Redes neurais",
          "Processamento de linguagem natural",
          "Etica em IA"
        ]}
      ]
    },
    { id: "cgu", nome: "CGU - Auditor Federal (TI)",
      descricao: "Edital CGU - Auditor Federal de Controle Interno - TI",
      disciplinas: [
        { nome:"GOVERNANCA DE TI", topicos:[
          "COBIT 2019",
          "ITIL 4",
          "ISO 38500",
          "Planejamento estrategico de TI",
          "Gestao de portfolio"
        ]},
        { nome:"SEGURANCA DA INFORMACAO", topicos:[
          "ISO 27001 e 27002",
          "Gestao de riscos (ISO 27005)",
          "Criptografia",
          "Seguranca em nuvem",
          "LGPD e privacidade"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem e normalizacao",
          "SQL",
          "Data mining",
          "Governanca de dados",
          "Qualidade de dados"
        ]},
        { nome:"DESENVOLVIMENTO E ARQUITETURA", topicos:[
          "Arquitetura de sistemas",
          "Padroes de projeto",
          "APIs e microsservicos",
          "Metodologias ageis",
          "DevOps e CI/CD"
        ]},
        { nome:"AUDITORIA DE TI", topicos:[
          "Fundamentos de auditoria",
          "Normas ISACA",
          "Auditoria de sistemas e seguranca",
          "Controles internos",
          "Relatorios de auditoria"
        ]}
      ]
    }
  ];

  const insC = db.prepare("INSERT INTO concursos (id, nome, descricao, ordem) VALUES (?, ?, ?, ?)");
  const insD = db.prepare("INSERT INTO disciplinas (id, concurso_id, nome, ordem) VALUES (?, ?, ?, ?)");
  const insT = db.prepare("INSERT INTO topicos (id, disciplina_id, texto, ordem) VALUES (?, ?, ?, ?)");

  const tx = db.transaction(function(){
    concursos.forEach(function(c, ci){
      insC.run(c.id, c.nome, c.descricao, ci);
      c.disciplinas.forEach(function(d, di){
        const discId = c.id + "-d" + di;
        insD.run(discId, c.id, d.nome, di);
        d.topicos.forEach(function(t, ti){
          insT.run(discId + "-t" + ti, discId, t, ti);
        });
      });
    });
  });
  tx();
  console.log("Banco populado com concursos iniciais.");
}
seed();

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function requireAdmin(req, res, next){
  const pass = req.headers["x-admin-password"];
  if(pass !== ADMIN_PASSWORD){
    return res.status(401).json({ error: "Senha de administrador invalida." });
  }
  next();
}

function requireUser(req, res, next){
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "");
  if(!token) return res.status(401).json({ error: "Nao autenticado." });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const u = db.prepare("SELECT id, email, nome, status FROM usuarios WHERE id = ?").get(payload.id);
    if(!u) return res.status(401).json({ error: "Usuario nao encontrado." });
    if(u.status !== "aprovado"){
      return res.status(403).json({ error: "Conta " + u.status + ". Aguarde aprovacao do administrador." });
    }
    req.user = u;
    next();
  } catch(e){
    return res.status(401).json({ error: "Sessao expirada." });
  }
}

/* ---------------------------------------------------------
   AUTH DE USUARIO
   --------------------------------------------------------- */
app.post("/api/auth/registrar", function(req, res){
  const email = req.body.email;
  const senha = req.body.senha;
  const nome = req.body.nome;

  if(!email || !senha) return res.status(400).json({ error: "E-mail e senha obrigatorios." });
  if(senha.length < 6) return res.status(400).json({ error: "Senha deve ter ao menos 6 caracteres." });

  const existe = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(email.toLowerCase());
  if(existe) return res.status(400).json({ error: "E-mail ja cadastrado." });

  const id = "u" + Date.now() + Math.random().toString(36).slice(2, 8);
  const hash = bcrypt.hashSync(senha, 10);
  db.prepare("INSERT INTO usuarios (id, email, senha_hash, nome, status) VALUES (?, ?, ?, ?, 'pendente')")
    .run(id, email.toLowerCase(), hash, nome || "");

  res.json({ ok: true, pendente: true, mensagem: "Cadastro recebido! Aguarde a aprovacao do administrador." });
});

app.post("/api/auth/login", function(req, res){
  const email = req.body.email;
  const senha = req.body.senha;
  if(!email || !senha) return res.status(400).json({ error: "E-mail e senha obrigatorios." });

  const u = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email.toLowerCase());
  if(!u) return res.status(401).json({ error: "E-mail ou senha invalidos." });

  if(!bcrypt.compareSync(senha, u.senha_hash)){
    return res.status(401).json({ error: "E-mail ou senha invalidos." });
  }

  if(u.status === "pendente"){
    return res.status(403).json({ error: "Sua conta ainda esta aguardando aprovacao do administrador." });
  }
  if(u.status === "bloqueado"){
    return res.status(403).json({ error: "Sua conta foi bloqueada. Fale com o administrador." });
  }

  const token = jwt.sign({ id: u.id, email: u.email }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ ok: true, token: token, usuario: { id: u.id, email: u.email, nome: u.nome } });
});

app.get("/api/auth/me", requireUser, function(req, res){
  res.json(req.user);
});

/* ---------------------------------------------------------
   API DO USUARIO
   --------------------------------------------------------- */
app.get("/api/meus-concursos", requireUser, function(req, res){
  const rows = db.prepare("SELECT c.* FROM concursos c INNER JOIN permissoes p ON p.concurso_id = c.id WHERE p.usuario_id = ? ORDER BY c.ordem, c.nome").all(req.user.id);
  res.json(rows);
});

app.get("/api/meus-concursos/:id", requireUser, function(req, res){
  const perm = db.prepare("SELECT 1 FROM permissoes WHERE usuario_id = ? AND concurso_id = ?").get(req.user.id, req.params.id);
  if(!perm) return res.status(403).json({ error: "Sem permissao." });

  const concurso = db.prepare("SELECT * FROM concursos WHERE id = ?").get(req.params.id);
  if(!concurso) return res.status(404).json({ error: "Nao encontrado." });

  const disciplinas = db.prepare("SELECT * FROM disciplinas WHERE concurso_id = ? ORDER BY ordem, nome").all(req.params.id);
  disciplinas.forEach(function(d){
    d.topicos = db.prepare("SELECT * FROM topicos WHERE disciplina_id = ? ORDER BY ordem, id").all(d.id);
  });
  concurso.disciplinas = disciplinas;
  res.json(concurso);
});

app.get("/api/meus-concursos/:id/progresso", requireUser, function(req, res){
  const perm = db.prepare("SELECT 1 FROM permissoes WHERE usuario_id = ? AND concurso_id = ?").get(req.user.id, req.params.id);
  if(!perm) return res.status(403).json({ error: "Sem permissao." });
  const rows = db.prepare("SELECT topico_id, done, grade FROM progresso WHERE usuario_id = ? AND concurso_id = ?").all(req.user.id, req.params.id);
  const map = {};
  rows.forEach(function(r){ map[r.topico_id] = { done: !!r.done, grade: r.grade }; });
  res.json(map);
});

app.post("/api/progresso", requireUser, function(req, res){
  const concurso_id = req.body.concurso_id;
  const topico_id = req.body.topico_id;
  const done = req.body.done;
  const grade = req.body.grade;

  if(!concurso_id || !topico_id) return res.status(400).json({ error: "Dados incompletos." });

  const perm = db.prepare("SELECT 1 FROM permissoes WHERE usuario_id = ? AND concurso_id = ?").get(req.user.id, concurso_id);
  if(!perm) return res.status(403).json({ error: "Sem permissao." });

  const existing = db.prepare("SELECT * FROM progresso WHERE usuario_id = ? AND concurso_id = ? AND topico_id = ?").get(req.user.id, concurso_id, topico_id);
  const doneVal = done ? 1 : 0;
  const gradeVal = (grade === null || grade === undefined || grade === "") ? null : Number(grade);

  if(existing){
    db.prepare("UPDATE progresso SET done = ?, grade = ? WHERE usuario_id = ? AND concurso_id = ? AND topico_id = ?").run(doneVal, gradeVal, req.user.id, concurso_id, topico_id);
  } else {
    db.prepare("INSERT INTO progresso (usuario_id, concurso_id, topico_id, done, grade) VALUES (?, ?, ?, ?, ?)").run(req.user.id, concurso_id, topico_id, doneVal, gradeVal);
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   API ADMIN
   --------------------------------------------------------- */
app.post("/api/admin/login", function(req, res){
  if(req.body.password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: "Senha incorreta." });
});

app.get("/api/admin/concursos", requireAdmin, function(req, res){
  res.json(db.prepare("SELECT * FROM concursos ORDER BY ordem, nome").all());
});

app.get("/api/admin/concursos/:id", requireAdmin, function(req, res){
  const c = db.prepare("SELECT * FROM concursos WHERE id = ?").get(req.params.id);
  if(!c) return res.status(404).json({ error: "Nao encontrado." });
  c.disciplinas = db.prepare("SELECT * FROM disciplinas WHERE concurso_id = ? ORDER BY ordem, nome").all(req.params.id);
  c.disciplinas.forEach(function(d){
    d.topicos = db.prepare("SELECT * FROM topicos WHERE disciplina_id = ? ORDER BY ordem, id").all(d.id);
  });
  res.json(c);
});

app.post("/api/admin/concursos", requireAdmin, function(req, res){
  const id = req.body.id;
  const nome = req.body.nome;
  const descricao = req.body.descricao;
  if(!id || !nome) return res.status(400).json({ error: "id e nome obrigatorios." });
  try {
    const row = db.prepare("SELECT MAX(ordem) AS m FROM concursos").get();
    const ordem = (row.m || 0) + 1;
    db.prepare("INSERT INTO concursos (id, nome, descricao, ordem) VALUES (?, ?, ?, ?)").run(id, nome, descricao || "", ordem);
    res.json({ ok: true });
  } catch(e){
    res.status(400).json({ error: "ID ja existe." });
  }
});

app.put("/api/admin/concursos/:id", requireAdmin, function(req, res){
  db.prepare("UPDATE concursos SET nome = ?, descricao = ? WHERE id = ?").run(req.body.nome, req.body.descricao || "", req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/concursos/:id", requireAdmin, function(req, res){
  db.prepare("DELETE FROM concursos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/disciplinas", requireAdmin, function(req, res){
  const concurso_id = req.body.concurso_id;
  const nome = req.body.nome;
  const id = concurso_id + "-d" + Date.now();
  const row = db.prepare("SELECT MAX(ordem) AS m FROM disciplinas WHERE concurso_id = ?").get(concurso_id);
  const ordem = (row.m || 0) + 1;
  db.prepare("INSERT INTO disciplinas (id, concurso_id, nome, ordem) VALUES (?, ?, ?, ?)").run(id, concurso_id, nome, ordem);
  res.json({ ok: true, id: id });
});

app.put("/api/admin/disciplinas/:id", requireAdmin, function(req, res){
  db.prepare("UPDATE disciplinas SET nome = ? WHERE id = ?").run(req.body.nome, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/disciplinas/:id", requireAdmin, function(req, res){
  db.prepare("DELETE FROM disciplinas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/topicos", requireAdmin, function(req, res){
  const disciplina_id = req.body.disciplina_id;
  const texto = req.body.texto;
  const id = disciplina_id + "-t" + Date.now();
  const row = db.prepare("SELECT MAX(ordem) AS m FROM topicos WHERE disciplina_id = ?").get(disciplina_id);
  const ordem = (row.m || 0) + 1;
  db.prepare("INSERT INTO topicos (id, disciplina_id, texto, ordem) VALUES (?, ?, ?, ?)").run(id, disciplina_id, texto, ordem);
  res.json({ ok: true, id: id });
});

app.put("/api/admin/topicos/:id", requireAdmin, function(req, res){
  db.prepare("UPDATE topicos SET texto = ? WHERE id = ?").run(req.body.texto, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/topicos/:id", requireAdmin, function(req, res){
  db.prepare("DELETE FROM topicos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* --------- ADMIN: usuarios --------- */
app.get("/api/admin/usuarios", requireAdmin, function(req, res){
  const us = db.prepare("SELECT id, email, nome, status, criado_em, aprovado_em FROM usuarios ORDER BY criado_em DESC").all();
  us.forEach(function(u){
    u.concursos = db.prepare("SELECT c.id, c.nome FROM concursos c INNER JOIN permissoes p ON p.concurso_id = c.id WHERE p.usuario_id = ?").all(u.id);
  });
  res.json(us);
});

app.post("/api/admin/usuarios/:id/status", requireAdmin, function(req, res){
  const status = req.body.status;
  if(["aprovado","pendente","bloqueado"].indexOf(status) === -1){
    return res.status(400).json({ error: "Status invalido." });
  }
  const aprovadoEm = status === "aprovado" ? new Date().toISOString() : null;
  db.prepare("UPDATE usuarios SET status = ?, aprovado_em = ? WHERE id = ?").run(status, aprovadoEm, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/usuarios/:id", requireAdmin, function(req, res){
  db.prepare("DELETE FROM usuarios WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/usuarios/:id/permissoes", requireAdmin, function(req, res){
  const concursos = req.body.concursos || [];
  const uid = req.params.id;

  const tx = db.transaction(function(){
    db.prepare("DELETE FROM permissoes WHERE usuario_id = ?").run(uid);
    concursos.forEach(function(cid){
      db.prepare("INSERT OR IGNORE INTO permissoes (usuario_id, concurso_id) VALUES (?, ?)").run(uid, cid);
    });
  });
  tx();
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   FALLBACK
   --------------------------------------------------------- */
app.get("/admin", function(req, res){
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", function(req, res){
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, function(){
  console.log("Meta TI rodando em http://localhost:" + PORT);
  console.log("Admin oculto em /admin");
});
