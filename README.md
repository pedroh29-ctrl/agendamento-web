# 💻 Agenda do Freelancer — Frontend

Interface web para a [Agendamento API](https://github.com/pedroh29-ctrl/agendamento-api): o freelancer faz login, gerencia clientes e serviços, define agendamentos e acompanha a agenda — tudo pelo navegador.

![HTML](https://img.shields.io/badge/HTML5-orange)
![CSS](https://img.shields.io/badge/CSS3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-yellow)

## ✨ O que faz

- **Login e cadastro** de profissional (autenticação HTTP Basic).
- **Agenda** com lista de agendamentos e ações de status (confirmar, concluir, cancelar).
- **Cadastro de serviços e clientes** com formulários simples.
- **Criação de agendamentos** escolhendo cliente, serviço e horário.
- Tratamento de erros da API (conflito de horário, dados inválidos, etc.) com mensagens claras.

## 🛠️ Tecnologias

HTML5 · CSS3 · JavaScript puro (sem frameworks) · Fetch API

Consome a **Agendamento API** (Spring Boot) hospedada no Render.

## ▶️ Como rodar

Como o frontend faz chamadas HTTP, sirva os arquivos por um servidor local (não abra o `index.html` direto pelo `file://`).

Com Python:

```bash
python -m http.server 5500
```

Depois abra no navegador: http://localhost:5500

Ou use a extensão **Live Server** do VS Code (botão "Go Live").

## ⚙️ Configuração

O endereço da API fica no topo do `app.js`:

```js
const API_BASE = "https://agendamento-api-i14n.onrender.com";
```

Para apontar para a API local, troque por `http://localhost:8080`.

## 📸 Fluxo de uso

1. Crie uma conta na aba **Criar conta**
2. Cadastre um **serviço** e um **cliente**
3. Vá em **Novo agendamento**, escolha cliente/serviço/horário
4. Acompanhe tudo na aba **Agenda**, confirmando ou cancelando
