/* =======================================================================
   app.js — lógica do frontend da Agenda do Freelancer.
   Consome a Agendamento API (Spring Boot) hospedada no Render.

   Autenticação: HTTP Basic. Ao logar, guardamos o header "Basic ..."
   no sessionStorage e o enviamos em toda chamada protegida.
   ======================================================================= */

// Endereço da API no ar. Para rodar contra a API local, troque por
// "http://localhost:8080".
const API_BASE = "https://agendamento-api-i14n.onrender.com";

// -----------------------------------------------------------------------
// Estado de sessão
// -----------------------------------------------------------------------

// Monta o header Basic a partir de e-mail e senha.
function montarAuth(email, senha) {
    return "Basic " + btoa(email + ":" + senha);
}

// Guarda/recupera a sessão no sessionStorage (some ao fechar a aba).
function salvarSessao(auth, nome) {
    sessionStorage.setItem("auth", auth);
    sessionStorage.setItem("nome", nome || "");
}
function obterAuth() {
    return sessionStorage.getItem("auth");
}
function limparSessao() {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("nome");
}

// -----------------------------------------------------------------------
// Overlay de carregamento: mostra um spinner enquanto a API responde.
// Conta chamadas em andamento para não esconder cedo demais.
// -----------------------------------------------------------------------
let chamadasEmAndamento = 0;

function mostrarCarregando(texto) {
    chamadasEmAndamento++;
    const el = document.getElementById("carregando");
    if (texto) document.getElementById("carregando-texto").textContent = texto;
    el.classList.remove("oculto");
}

function esconderCarregando() {
    chamadasEmAndamento = Math.max(0, chamadasEmAndamento - 1);
    if (chamadasEmAndamento === 0) {
        document.getElementById("carregando").classList.add("oculto");
    }
}

// -----------------------------------------------------------------------
// Chamada genérica à API. Adiciona o header de autenticação (se houver) e
// trata os erros mais comuns, devolvendo uma mensagem amigável.
// -----------------------------------------------------------------------
async function api(caminho, opcoes = {}) {
    const headers = opcoes.headers || {};
    headers["Content-Type"] = "application/json";

    const auth = obterAuth();
    if (auth) headers["Authorization"] = auth;

    mostrarCarregando(opcoes.textoCarregando);
    let resposta;
    try {
        resposta = await fetch(API_BASE + caminho, { ...opcoes, headers });
    } finally {
        esconderCarregando();
    }

    // 204 = sem conteúdo (ex: DELETE); devolve null.
    if (resposta.status === 204) return null;

    let corpo = null;
    const texto = await resposta.text();
    if (texto) {
        try { corpo = JSON.parse(texto); } catch { corpo = texto; }
    }

    if (!resposta.ok) {
        const msg = extrairMensagemErro(resposta.status, corpo);
        throw new Error(msg);
    }
    return corpo;
}

// Transforma o corpo de erro da API em uma frase legível.
function extrairMensagemErro(status, corpo) {
    if (status === 401) return "E-mail ou senha inválidos.";
    if (corpo && typeof corpo === "object") {
        if (corpo.erro) return corpo.erro;               // RegraNegocio / NaoEncontrado
        const campos = Object.values(corpo);             // erros de validação (campo->msg)
        if (campos.length) return campos.join(" · ");
    }
    if (status === 409) return "Conflito (horário ocupado ou dado duplicado).";
    if (status === 404) return "Não encontrado.";
    return "Erro na requisição (" + status + ").";
}

// -----------------------------------------------------------------------
// Utilidades de UI
// -----------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

function mostrarMensagem(elId, texto, tipo) {
    const el = $(elId);
    el.textContent = texto;
    el.className = "mensagem " + (tipo || "");
}

function formatarDataHora(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// -----------------------------------------------------------------------
// Alternância de telas
// -----------------------------------------------------------------------
function irParaDashboard() {
    $("tela-login").classList.add("oculto");
    $("tela-dashboard").classList.remove("oculto");
    $("area-usuario").classList.remove("oculto");
    $("nome-usuario").textContent = sessionStorage.getItem("nome") || "";
    carregarTudo();
}

function irParaLogin() {
    $("tela-dashboard").classList.add("oculto");
    $("area-usuario").classList.add("oculto");
    $("tela-login").classList.remove("oculto");
}

// =======================================================================
// AUTENTICAÇÃO (abas, login, registro, logout)
// =======================================================================

// Alterna entre as abas "Entrar" e "Criar conta".
document.querySelectorAll(".aba").forEach((aba) => {
    aba.addEventListener("click", () => {
        document.querySelectorAll(".aba").forEach((a) => a.classList.remove("ativa"));
        aba.classList.add("ativa");
        const alvo = aba.dataset.aba;
        $("form-login").classList.toggle("oculto", alvo !== "entrar");
        $("form-registro").classList.toggle("oculto", alvo !== "registrar");
        mostrarMensagem("msg-auth", "", "");
    });
});

// Login: valida as credenciais chamando um endpoint protegido (/profissionais/eu).
$("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("login-email").value.trim();
    const senha = $("login-senha").value;
    mostrarMensagem("msg-auth", "Entrando...", "");

    salvarSessao(montarAuth(email, senha), "");
    try {
        const eu = await api("/profissionais/eu", { textoCarregando: "Entrando... (pode levar até 1 min no primeiro acesso)" });
        salvarSessao(montarAuth(email, senha), eu.nome);
        mostrarMensagem("msg-auth", "", "");
        irParaDashboard();
    } catch (err) {
        limparSessao();
        mostrarMensagem("msg-auth", err.message, "erro");
    }
});

// Registro: cria a conta e já entra em seguida.
$("form-registro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("reg-nome").value.trim();
    const profissao = $("reg-profissao").value.trim();
    const email = $("reg-email").value.trim();
    const senha = $("reg-senha").value;
    mostrarMensagem("msg-auth", "Criando conta...", "");

    try {
        await api("/profissionais/registrar", {
            method: "POST",
            body: JSON.stringify({ nome, profissao, email, senha }),
            textoCarregando: "Criando conta... (pode levar até 1 min no primeiro acesso)"
        });
        // Conta criada: autentica e entra.
        salvarSessao(montarAuth(email, senha), nome);
        irParaDashboard();
    } catch (err) {
        mostrarMensagem("msg-auth", err.message, "erro");
    }
});

// Logout
$("btn-sair").addEventListener("click", () => {
    limparSessao();
    irParaLogin();
});

// =======================================================================
// NAVEGAÇÃO ENTRE SEÇÕES DO DASHBOARD
// =======================================================================
document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".menu-item").forEach((i) => i.classList.remove("ativa"));
        item.classList.add("ativa");
        const secao = item.dataset.secao;
        ["agenda", "agendar", "servicos", "clientes"].forEach((s) => {
            $("secao-" + s).classList.toggle("oculto", s !== secao);
        });
    });
});

// =======================================================================
// CARREGAMENTO DE DADOS
// =======================================================================

// Carrega tudo ao entrar no dashboard.
async function carregarTudo() {
    await Promise.all([carregarAgenda(), carregarServicos(), carregarClientes()]);
}

// ----- Agenda -----
async function carregarAgenda() {
    const lista = $("lista-agenda");
    lista.innerHTML = "<p class='vazio'>Carregando...</p>";
    try {
        const ags = await api("/agendamentos");
        if (!ags.length) {
            lista.innerHTML = "<p class='vazio'>Nenhum agendamento ainda.</p>";
            return;
        }
        lista.innerHTML = "";
        ags.forEach((a) => lista.appendChild(criarItemAgendamento(a)));
    } catch (err) {
        lista.innerHTML = "<p class='vazio'>" + err.message + "</p>";
    }
}

function criarItemAgendamento(a) {
    const div = document.createElement("div");
    div.className = "item";

    const cliente = a.cliente ? a.cliente.nome : "-";
    const servico = a.servico ? a.servico.nome : "-";

    div.innerHTML = `
        <div class="item-info">
            <strong>${servico} — ${cliente}</strong>
            <small>${formatarDataHora(a.inicio)} → ${formatarDataHora(a.fim)}</small>
            ${a.observacoes ? `<small> · ${a.observacoes}</small>` : ""}
        </div>
        <div class="item-acoes">
            <span class="status status-${a.status}">${a.status}</span>
        </div>
    `;

    // Ações conforme o status (respeitando as transições da API).
    const acoes = div.querySelector(".item-acoes");
    if (a.status === "PENDENTE") {
        acoes.appendChild(botaoStatus(a.id, "CONFIRMADO", "Confirmar"));
        acoes.appendChild(botaoStatus(a.id, "CANCELADO", "Cancelar"));
    } else if (a.status === "CONFIRMADO") {
        acoes.appendChild(botaoStatus(a.id, "CONCLUIDO", "Concluir"));
        acoes.appendChild(botaoStatus(a.id, "CANCELADO", "Cancelar"));
    }
    return div;
}

function botaoStatus(id, novoStatus, rotulo) {
    const btn = document.createElement("button");
    btn.textContent = rotulo;
    btn.addEventListener("click", async () => {
        try {
            await api("/agendamentos/" + id + "/status", {
                method: "PATCH",
                body: JSON.stringify({ status: novoStatus })
            });
            carregarAgenda();
        } catch (err) {
            alert(err.message);
        }
    });
    return btn;
}

// ----- Serviços -----
async function carregarServicos() {
    const lista = $("lista-servicos");
    const select = $("ag-servico");
    try {
        const servicos = await api("/servicos");
        // Preenche a lista
        lista.innerHTML = servicos.length ? "" : "<p class='vazio'>Nenhum serviço cadastrado.</p>";
        servicos.forEach((s) => {
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div class="item-info">
                    <strong>${s.nome}</strong>
                    <small>${s.duracaoMinutos} min · ${formatarPreco(s.preco)}${s.descricao ? " · " + s.descricao : ""}</small>
                </div>`;
            lista.appendChild(div);
        });
        // Preenche o select do formulário de agendamento
        select.innerHTML = "";
        servicos.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.nome + " (" + s.duracaoMinutos + " min)";
            select.appendChild(opt);
        });
    } catch (err) {
        lista.innerHTML = "<p class='vazio'>" + err.message + "</p>";
    }
}

// ----- Clientes -----
async function carregarClientes() {
    const lista = $("lista-clientes");
    const select = $("ag-cliente");
    try {
        const clientes = await api("/clientes");
        lista.innerHTML = clientes.length ? "" : "<p class='vazio'>Nenhum cliente cadastrado.</p>";
        clientes.forEach((c) => {
            const div = document.createElement("div");
            div.className = "item";
            div.innerHTML = `
                <div class="item-info">
                    <strong>${c.nome}</strong>
                    <small>${c.email} · ${c.telefone}</small>
                </div>`;
            lista.appendChild(div);
        });
        select.innerHTML = "";
        clientes.forEach((c) => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.nome;
            select.appendChild(opt);
        });
    } catch (err) {
        lista.innerHTML = "<p class='vazio'>" + err.message + "</p>";
    }
}

// =======================================================================
// FORMULÁRIOS DE CADASTRO
// =======================================================================

// Novo serviço
$("form-servico").addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarMensagem("msg-servico", "Salvando...", "");
    try {
        await api("/servicos", {
            method: "POST",
            body: JSON.stringify({
                nome: $("sv-nome").value.trim(),
                descricao: $("sv-descricao").value.trim(),
                duracaoMinutos: Number($("sv-duracao").value),
                preco: Number($("sv-preco").value)
            })
        });
        e.target.reset();
        mostrarMensagem("msg-servico", "Serviço adicionado!", "sucesso");
        carregarServicos();
    } catch (err) {
        mostrarMensagem("msg-servico", err.message, "erro");
    }
});

// Novo cliente
$("form-cliente").addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarMensagem("msg-cliente", "Salvando...", "");
    try {
        await api("/clientes", {
            method: "POST",
            body: JSON.stringify({
                nome: $("cl-nome").value.trim(),
                email: $("cl-email").value.trim(),
                telefone: $("cl-telefone").value.trim()
            })
        });
        e.target.reset();
        mostrarMensagem("msg-cliente", "Cliente adicionado!", "sucesso");
        carregarClientes();
    } catch (err) {
        mostrarMensagem("msg-cliente", err.message, "erro");
    }
});

// Novo agendamento
$("form-agendamento").addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarMensagem("msg-agendamento", "Agendando...", "");
    try {
        // O input datetime-local devolve "2026-10-05T09:00" (sem segundos).
        // Acrescentamos ":00" quando faltarem, para ficar no formato ISO completo.
        let inicio = $("ag-inicio").value;
        if (inicio && inicio.length === 16) inicio += ":00";

        await api("/agendamentos", {
            method: "POST",
            body: JSON.stringify({
                clienteId: Number($("ag-cliente").value),
                servicoId: Number($("ag-servico").value),
                inicio: inicio,
                observacoes: $("ag-obs").value.trim()
            })
        });
        e.target.reset();
        mostrarMensagem("msg-agendamento", "Agendamento criado!", "sucesso");
        carregarAgenda();
    } catch (err) {
        mostrarMensagem("msg-agendamento", err.message, "erro");
    }
});

// Botão de atualizar a agenda manualmente
$("btn-atualizar-agenda").addEventListener("click", carregarAgenda);

// =======================================================================
// INICIALIZAÇÃO: se já houver sessão salva, vai direto pro dashboard.
// =======================================================================
if (obterAuth()) {
    irParaDashboard();
} else {
    irParaLogin();
}
