const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ⚠️ TROQUE ESSA SENHA ANTES DE PUBLICAR (ou defina a env var ADMIN_PASSWORD no Render)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "metati-admin-2026";

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

  CREATE TABLE IF NOT EXISTS progresso (
    concurso_id TEXT NOT NULL,
    topico_id TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    grade INTEGER,
    PRIMARY KEY (concurso_id, topico_id)
  );
`);

/* ---------------------------------------------------------
   SEED INICIAL (só roda se estiver vazio)
   --------------------------------------------------------- */
function seed(){
  const count = db.prepare("SELECT COUNT(*) AS n FROM concursos").get().n;
  if(count > 0) return;

  const concursos = [
    {
      id: "pf",
      nome: "Polícia Federal - Agente (TI)",
      descricao: "Edital PF Agente de Polícia - área de TI",
      disciplinas: [
        { nome:"INFRAESTRUTURA DE TI", topicos:[
          "Conceitos de rede: LAN, WAN, VPN",
          "Endereçamento IPv4 e IPv6",
          "Serviços: DNS, DHCP, HTTP, HTTPS, FTP",
          "Virtualização e containers",
          "Backup, restore e continuidade de negócios"
        ]},
        { nome:"SEGURANÇA CIBERNÉTICA", topicos:[
          "Criptografia simétrica e assimétrica",
          "Certificação digital e ICP-Brasil",
          "Ataques cibernéticos e mitigação",
          "Gestão de identidades e acessos",
          "Normas e boas práticas (ISO 27001, NIST)"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem de dados relacional",
          "SQL: DDL, DML, DQL e DCL",
          "Normalização (1FN, 2FN, 3FN)",
          "Índices, views e procedures",
          "Tuning e otimização de consultas"
        ]},
        { nome:"DESENVOLVIMENTO DE SISTEMAS", topicos:[
          "Lógica de programação e algoritmos",
          "Estruturas de dados",
          "Programação orientada a objetos",
          "Metodologias ágeis (Scrum, Kanban)",
          "APIs REST e integração de sistemas"
        ]},
        { nome:"SISTEMAS OPERACIONAIS", topicos:[
          "Linux: comandos, permissões e processos",
          "Windows Server: AD, DNS e GPO",
          "Gerenciamento de usuários e grupos",
          "Shell script e automação",
          "Monitoramento e logs"
        ]},
        { nome:"COMPUTAÇÃO FORENSE", topicos:[
          "Cadeia de custódia",
          "Coleta e preservação de evidências digitais",
          "Análise de dispositivos móveis",
          "Ferramentas forenses",
          "Legislação aplicada (Marco Civil, LGPD)"
        ]}
      ]
    },
    {
      id: "prf",
      nome: "PRF - Policial Rodoviário Federal (TI)",
      descricao: "Edital PRF - área de Tecnologia da Informação",
      disciplinas: [
        { nome:"INFORMÁTICA BÁSICA E AVANÇADA", topicos:[
          "Sistemas operacionais Windows e Linux",
          "Pacote Office e LibreOffice",
          "Redes de computadores e internet",
          "Segurança da informação",
          "Computação em nuvem"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem relacional",
          "SQL: consultas e manipulação",
          "Normalização",
          "Transações e ACID",
          "NoSQL"
        ]},
        { nome:"DESENVOLVIMENTO DE SISTEMAS", topicos:[
          "Lógica de programação",
          "Programação orientada a objetos",
          "Estruturas de dados",
          "APIs e integração",
          "Metodologias ágeis"
        ]},
        { nome:"INFRAESTRUTURA E REDES", topicos:[
          "Modelo OSI e TCP/IP",
          "Roteamento e switching",
          "Redes sem fio",
          "Virtualização",
          "Cloud computing"
        ]},
        { nome:"SEGURANÇA DA INFORMAÇÃO", topicos:[
          "Criptografia",
          "Certificação digital",
          "Ataques e mitigação",
          "LGPD",
          "Gestão de incidentes"
        ]}
      ]
    },
    {
      id: "bacen",
      nome: "BACEN - Analista (TI)",
      descricao: "Edital BACEN - Analista do Banco Central - Tecnologia da Informação",
      disciplinas: [
        { nome:"INFRAESTRUTURA DE TI", topicos:[
          "Redes: modelo OSI, TCP/IP, roteamento",
          "Sistemas operacionais Linux e Windows",
          "Virtualização e containers",
          "Cloud computing (IaaS, PaaS, SaaS)",
          "Monitoramento e observabilidade"
        ]},
        { nome:"SEGURANÇA DA INFORMAÇÃO", topicos:[
          "ISO 27001 e 27002",
          "Criptografia aplicada",
          "Gestão de riscos",
          "Segurança em nuvem",
          "Resposta a incidentes"
        ]},
        { nome:"BANCO DE DADOS E BIG DATA", topicos:[
          "Modelagem relacional e dimensional",
          "SQL avançado",
          "NoSQL e bancos distribuídos",
          "Data warehouse e ETL",
          "Big data e analytics"
        ]},
        { nome:"ENGENHARIA DE SOFTWARE", topicos:[
          "Ciclo de vida de software",
          "Metodologias ágeis e DevOps",
          "Arquitetura de software",
          "Testes e qualidade",
          "CI/CD"
        ]},
        { nome:"GOVERNANÇA E GESTÃO DE TI", topicos:[
          "COBIT 2019",
          "ITIL 4",
          "PMBOK",
          "Contratações de TI",
          "LGPD"
        ]},
        { nome:"CIÊNCIA DE DADOS E IA", topicos:[
          "Estatística e probabilidade",
          "Machine learning",
          "Redes neurais",
          "Processamento de linguagem natural",
          "Ética em IA"
        ]}
      ]
    },
    {
      id: "cgu",
      nome: "CGU - Auditor Federal (TI)",
      descricao: "Edital CGU - Auditor Federal de Controle Interno - TI",
      disciplinas: [
        { nome:"GOVERNANÇA DE TI", topicos:[
          "COBIT 2019",
          "ITIL 4",
          "ISO 38500",
          "Planejamento estratégico de TI",
          "Gestão de portfólio"
        ]},
        { nome:"SEGURANÇA DA INFORMAÇÃO", topicos:[
          "ISO 27001 e 27002",
          "Gestão de riscos (ISO 27005)",
          "Criptografia",
          "Segurança em nuvem",
          "LGPD e privacidade"
        ]},
        { nome:"BANCO DE DADOS", topicos:[
          "Modelagem e normalização",
          "SQL",
          "Data mining",
          "Governança de dados",
          "Qualidade de dados"
        ]},
        { nome:"DESENVOLVIMENTO E ARQUITETURA", topicos:[
          "Arquitetura de sistemas",
          "Padrões de projeto",
          "APIs e microsserviços",
          "Metodologias ágeis",
          "DevOps e CI/CD"
        ]},
        { nome:"AUDITORIA DE TI", topicos:[
          "Fundamentos de auditoria",
          "Normas ISACA",
          "Auditoria de sistemas e segurança",
          "Controles internos",
          "Relatórios de auditoria"
        ]}
      ]
    }
  ];

  const insC = db.prepare("INSERT INTO concursos (id, nome, descricao, ordem) VALUES (?, ?, ?, ?)");
  const insD = db.prepare("INSERT INTO disciplinas (id, concurso_id, nome, ordem) VALUES (?, ?, ?, ?)");
  const insT = db.prepare("INSERT INTO topicos (id, disciplina_id, texto, ordem) VALUES (?, ?, ?, ?)");

  const tx = db.transaction(() => {
    concursos.forEach((c, ci) => {
      insC.run(c.id, c.nome, c.descricao, ci);
      c.disciplinas.forEach((d, di) => {
        const discId = `${c.id}-d${di}`;
        insD.run(discId, c.id, d.nome, di);
        d.topicos.forEach((t, ti) => {
          insT.run(`${discId}-t${ti}`, discId, t, ti);
        });
      });
    });
  });
  tx();
  console.log("✅ Banco populado com concursos iniciais.");
}
seed();

/* ---------------------------------------------------------
   MIDDLEWARE DE ADMIN
   --------------------------------------------------------- */
function requireAdmin(req, res, next){
  const pass = req.headers["x-admin-password"] || req.query.admin;
  if(pass !== ADMIN_PASSWORD){
    return res.status(401).json({ error: "Senha de administrador inválida." });
  }
  next();
}

/* ---------------------------------------------------------
   API PÚBLICA
   --------------------------------------------------------- */
app.get("/api/concursos", (req, res) => {
  const concursos = db.prepare("SELECT * FROM concursos ORDER BY ordem, nome").all();
  res.json(concursos);
});

app.get("/api/concursos/:id", (req, res) => {
  const concurso = db.prepare("SELECT * FROM concursos WHERE id = ?").get(req.params.id);
  if(!concurso) return res.status(404).json({ error: "Concurso não encontrado." });

  const disciplinas = db.prepare("SELECT * FROM disciplinas WHERE concurso_id = ? ORDER BY ordem, nome").all(req.params.id);
  disciplinas.forEach(d => {
    d.topicos = db.prepare("SELECT * FROM topicos WHERE disciplina_id = ? ORDER BY ordem, id").all(d.id);
  });
  concurso.disciplinas = disciplinas;
  res.json(concurso);
});

app.get("/api/concursos/:id/progresso", (req, res) => {
  const rows = db.prepare("SELECT topico_id, done, grade FROM progresso WHERE concurso_id = ?").all(req.params.id);
  const map = {};
  rows.forEach(r => { map[r.topico_id] = { done: !!r.done, grade: r.grade }; });
  res.json(map);
});

app.post("/api/progresso", (req, res) => {
  const { concurso_id, topico_id, done, grade } = req.body;
  if(!concurso_id || !topico_id){
    return res.status(400).json({ error: "concurso_id e topico_id são obrigatórios." });
  }
  const existing = db.prepare("SELECT * FROM progresso WHERE concurso_id = ? AND topico_id = ?")
                     .get(concurso_id, topico_id);

  const doneVal = done ? 1 : 0;
  const gradeVal = (grade === null || grade === undefined || grade === "") ? null : Number(grade);

  if(existing){
    db.prepare("UPDATE progresso SET done = ?, grade = ? WHERE concurso_id = ? AND topico_id = ?")
      .run(doneVal, gradeVal, concurso_id, topico_id);
  } else {
    db.prepare("INSERT INTO progresso (concurso_id, topico_id, done, grade) VALUES (?, ?, ?, ?)")
      .run(concurso_id, topico_id, doneVal, gradeVal);
  }
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   API ADMIN (protegida por senha)
   --------------------------------------------------------- */
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if(password === ADMIN_PASSWORD){
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Senha incorreta." });
});

app.post("/api/admin/concursos", requireAdmin, (req, res) => {
  const { id, nome, descricao } = req.body;
  if(!id || !nome) return res.status(400).json({ error: "id e nome obrigatórios." });
  try {
    const ordem = (db.prepare("SELECT MAX(ordem) AS m FROM concursos").get().m || 0) + 1;
    db.prepare("INSERT INTO concursos (id, nome, descricao, ordem) VALUES (?, ?, ?, ?)")
      .run(id, nome, descricao || "", ordem);
    res.json({ ok: true });
  } catch(e){
    res.status(400).json({ error: "Concurso já existe ou id inválido." });
  }
});
app.post("/api/auth/registrar", (req, res) => {
  ...
  db.prepare("INSERT INTO usuarios (id, email, senha_hash, nome, status) VALUES (?, ?, ?, ?, 'pendente')")
    .run(id, email.toLowerCase(), hash, nome || "");
  ...
});
app.put("/api/admin/concursos/:id", requireAdmin, (req, res) => {
  const { nome, descricao } = req.body;
  db.prepare("UPDATE concursos SET nome = ?, descricao = ? WHERE id = ?")
    .run(nome, descricao || "", req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/concursos/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM concursos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/disciplinas", requireAdmin, (req, res) => {
  const { concurso_id, nome } = req.body;
  if(!concurso_id || !nome) return res.status(400).json({ error: "Dados incompletos." });
  const id = `${concurso_id}-d${Date.now()}`;
  const ordem = (db.prepare("SELECT MAX(ordem) AS m FROM disciplinas WHERE concurso_id = ?").get(concurso_id).m || 0) + 1;
  db.prepare("INSERT INTO disciplinas (id, concurso_id, nome, ordem) VALUES (?, ?, ?, ?)")
    .run(id, concurso_id, nome, ordem);
  res.json({ ok: true, id });
});

app.put("/api/admin/disciplinas/:id", requireAdmin, (req, res) => {
  const { nome } = req.body;
  db.prepare("UPDATE disciplinas SET nome = ? WHERE id = ?").run(nome, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/disciplinas/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM disciplinas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.post("/api/admin/topicos", requireAdmin, (req, res) => {
  const { disciplina_id, texto } = req.body;
  if(!disciplina_id || !texto) return res.status(400).json({ error: "Dados incompletos." });
  const id = `${disciplina_id}-t${Date.now()}`;
  const ordem = (db.prepare("SELECT MAX(ordem) AS m FROM topicos WHERE disciplina_id = ?").get(disciplina_id).m || 0) + 1;
  db.prepare("INSERT INTO topicos (id, disciplina_id, texto, ordem) VALUES (?, ?, ?, ?)")
    .run(id, disciplina_id, texto, ordem);
  res.json({ ok: true, id });
});

app.put("/api/admin/topicos/:id", requireAdmin, (req, res) => {
  const { texto } = req.body;
  db.prepare("UPDATE topicos SET texto = ? WHERE id = ?").run(texto, req.params.id);
  res.json({ ok: true });
});

app.delete("/api/admin/topicos/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM topicos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

/* ---------------------------------------------------------
   FALLBACK SPA
   --------------------------------------------------------- */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Meta TI rodando em http://localhost:${PORT}`);
});
