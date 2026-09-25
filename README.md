# 💻 Agenda do Freelancer — Frontend

Interface web para a [Agendamento API](https://github.com/pedroh29-ctrl/agendamento-api). Tem dois ambientes: um **painel** para o profissional gerenciar sua agenda e uma **página pública** onde o próprio cliente marca o horário — estilo Calendly/Booksy.

![HTML](https://img.shields.io/badge/HTML5-orange)
![CSS](https://img.shields.io/badge/CSS3-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-vanilla-yellow)

## 🚀 Demo ao vivo

- **Painel do profissional:** https://pedroh29-ctrl.github.io/agendamento-web/
- **Página pública de agendamento:** https://pedroh29-ctrl.github.io/agendamento-web/agendar.html

> No primeiro acesso, a API (plano gratuito do Render) pode levar ~1 min para "acordar".

## ✨ O que faz

### Painel do profissional (com login)
- **Login e cadastro** de profissional (autenticação HTTP Basic).
- **Agenda** com lista de agendamentos e ações de status (confirmar, concluir, cancelar).
- **Cadastro de serviços e clientes** com formulários simples.
- **Criação de agendamentos** escolhendo cliente, serviço e horário.
- **Meu perfil** — edição de nome, profissão e **chave Pix** (usada para receber os pagamentos).

### Página pública (sem login, para o cliente)
- O cliente escolhe o **profissional** e o **serviço**.
- Escolhe uma **data** e vê os **horários disponíveis** em botões (os ocupados não aparecem).
- Preenche seus dados e marca — recebe uma confirmação com o **valor** e a **chave Pix** para pagamento.

Tratamento de erros da API (conflito de horário, dados inválidos, etc.) com mensagens claras, e overlay de carregamento durante as chamadas.

## 🛠️ Tecnologias

HTML5 · CSS3 · JavaScript puro (sem frameworks) · Fetch API

Consome a **Agendamento API** (Spring Boot) hospedada no Render. Publicado via GitHub Pages.

## ▶️ Como rodar

Como o frontend faz chamadas HTTP, sirva os arquivos por um servidor local (não abra o `index.html` direto pelo `file://`).

Com Python:

```bash
python -m http.server 5500
```

Depois abra no navegador: http://localhost:5500

Ou use a extensão **Live Server** do VS Code (botão "Go Live").

## ⚙️ Configuração

O endereço da API fica no topo do `app.js` e do `agendar.js`:

```js
const API_BASE = "https://agendamento-api-i14n.onrender.com";
```

Para apontar para a API local, troque por `http://localhost:8080`.

## 📂 Arquivos

| Arquivo        | O que é                                             |
|----------------|-----------------------------------------------------|
| `index.html`   | Painel do profissional (login e gestão da agenda)   |
| `app.js`       | Lógica do painel                                    |
| `agendar.html` | Página pública de agendamento (para o cliente)      |
| `agendar.js`   | Lógica da página pública                            |
| `styles.css`   | Estilos compartilhados                              |

## 📸 Fluxo de uso

**Profissional:**
1. Crie sua conta e faça login
2. Cadastre um **serviço** e sua **chave Pix** (aba Meu perfil)
3. Acompanhe os agendamentos na aba **Agenda**, confirmando ou cancelando

**Cliente (página pública):**
1. Abre o link, escolhe o profissional e o serviço
2. Escolhe a data e um dos horários disponíveis
3. Preenche os dados e marca — vê o valor e a chave Pix para pagar
