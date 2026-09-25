/* =======================================================================
   agendar.js — página PÚBLICA de agendamento.
   O cliente escolhe profissional, serviço e horário, informa seus dados
   e marca — tudo SEM login, usando os endpoints /publico da API.
   ======================================================================= */

const API_BASE = "https://agendamento-api-i14n.onrender.com";

const $ = (id) => document.getElementById(id);

// -----------------------------------------------------------------------
// Overlay de carregamento
// -----------------------------------------------------------------------
let emAndamento = 0;
function mostrarCarregando(texto) {
    emAndamento++;
    if (texto) $("carregando-texto").textContent = texto;
    $("carregando").classList.remove("oculto");
}
function esconderCarregando() {
    emAndamento = Math.max(0, emAndamento - 1);
    if (emAndamento === 0) $("carregando").classList.add("oculto");
}

// -----------------------------------------------------------------------
// Chamada à API (endpoints públicos, sem Authorization)
// -----------------------------------------------------------------------
async function api(caminho, opcoes = {}) {
    const headers = { "Content-Type": "application/json" };
    mostrarCarregando(opcoes.textoCarregando);
    let resposta;
    try {
        resposta = await fetch(API_BASE + caminho, { ...opcoes, headers });
    } finally {
        esconderCarregando();
    }

    if (resposta.status === 204) return null;
    let corpo = null;
    const texto = await resposta.text();
    if (texto) {
        try { corpo = JSON.parse(texto); } catch { corpo = texto; }
    }
    if (!resposta.ok) {
        throw new Error(extrairMensagemErro(resposta.status, corpo));
    }
    return corpo;
}

function extrairMensagemErro(status, corpo) {
    if (corpo && typeof corpo === "object") {
        if (corpo.erro) return corpo.erro;
        const campos = Object.values(corpo);
        if (campos.length) return campos.join(" · ");
    }
    if (status === 409) return "Esse horário já está ocupado. Escolha outro.";
    return "Não foi possível marcar (" + status + ").";
}

function mostrarMensagem(texto, tipo) {
    const el = $("msg-pub");
    el.textContent = texto;
    el.className = "mensagem " + (tipo || "");
}

function formatarDataHora(iso) {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

// -----------------------------------------------------------------------
// Carrega a lista de profissionais ao abrir a página.
// -----------------------------------------------------------------------
async function carregarProfissionais() {
    try {
        const profs = await api("/publico/profissionais", {
            textoCarregando: "Carregando... (pode levar até 1 min no primeiro acesso)"
        });
        const sel = $("pub-profissional");
        sel.innerHTML = "";
        if (!profs.length) {
            mostrarMensagem("Nenhum profissional disponível ainda.", "erro");
            return;
        }
        profs.forEach((p) => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.nome + (p.profissao ? " — " + p.profissao : "");
            sel.appendChild(opt);
        });
        // Carrega os serviços do primeiro profissional.
        carregarServicos(sel.value);
    } catch (err) {
        mostrarMensagem(err.message, "erro");
    }
}

// -----------------------------------------------------------------------
// Carrega os serviços do profissional escolhido.
// -----------------------------------------------------------------------
async function carregarServicos(profissionalId) {
    const sel = $("pub-servico");
    sel.innerHTML = "";
    try {
        const servicos = await api("/publico/profissionais/" + profissionalId + "/servicos");
        if (!servicos.length) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Este profissional ainda não tem serviços";
            sel.appendChild(opt);
            return;
        }
        servicos.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.id;
            const preco = Number(s.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            opt.textContent = `${s.nome} — ${s.duracaoMinutos} min · ${preco}`;
            sel.appendChild(opt);
        });
    } catch (err) {
        mostrarMensagem(err.message, "erro");
    }
}

// Ao trocar de profissional, recarrega os serviços dele (e limpa horários).
$("pub-profissional").addEventListener("change", (e) => {
    carregarServicos(e.target.value);
    limparHorarios();
});

// Ao trocar o serviço ou a data, recarrega os horários disponíveis.
$("pub-servico").addEventListener("change", carregarHorarios);
$("pub-data").addEventListener("change", carregarHorarios);

// Horário escolhido pelo cliente (preenchido ao clicar num botão).
let horarioSelecionado = null;

function limparHorarios() {
    horarioSelecionado = null;
    $("lista-horarios").innerHTML = "";
    $("horarios-info").textContent = "Escolha uma data para ver os horários.";
    $("horarios-info").classList.remove("oculto");
}

// -----------------------------------------------------------------------
// Busca os horários livres para o profissional/serviço/data escolhidos e
// mostra cada um como um botão clicável.
// -----------------------------------------------------------------------
async function carregarHorarios() {
    const profissionalId = $("pub-profissional").value;
    const servicoId = $("pub-servico").value;
    const data = $("pub-data").value; // formato YYYY-MM-DD

    horarioSelecionado = null;
    const lista = $("lista-horarios");
    const info = $("horarios-info");
    lista.innerHTML = "";

    if (!profissionalId || !servicoId || !data) {
        info.textContent = "Escolha o serviço e a data para ver os horários.";
        info.classList.remove("oculto");
        return;
    }

    info.textContent = "Carregando horários...";
    info.classList.remove("oculto");

    try {
        const horarios = await api(
            `/publico/horarios?profissionalId=${profissionalId}&servicoId=${servicoId}&data=${data}`
        );
        if (!horarios.length) {
            info.textContent = "Nenhum horário disponível nesse dia. Tente outra data.";
            return;
        }
        info.classList.add("oculto");
        horarios.forEach((iso) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "chip-horario";
            // Mostra só a hora (HH:mm) no botão.
            btn.textContent = new Date(iso).toLocaleTimeString("pt-BR", {
                hour: "2-digit", minute: "2-digit"
            });
            btn.addEventListener("click", () => {
                horarioSelecionado = iso;
                document.querySelectorAll(".chip-horario").forEach((b) => b.classList.remove("ativa"));
                btn.classList.add("ativa");
                mostrarMensagem("", "");
            });
            lista.appendChild(btn);
        });
    } catch (err) {
        info.textContent = err.message;
    }
}

// -----------------------------------------------------------------------
// Marcar o horário.
// -----------------------------------------------------------------------
$("btn-marcar").addEventListener("click", async () => {
    const profissionalId = Number($("pub-profissional").value);
    const servicoId = Number($("pub-servico").value);

    if (!profissionalId || !servicoId) {
        mostrarMensagem("Escolha o profissional e o serviço.", "erro");
        return;
    }
    if (!horarioSelecionado) {
        mostrarMensagem("Escolha um horário disponível.", "erro");
        return;
    }
    const inicio = horarioSelecionado; // já vem no formato ISO da API

    const nome = $("pub-nome").value.trim();
    const email = $("pub-email").value.trim();
    const telefone = $("pub-telefone").value.trim();
    if (!nome || !email || !telefone) {
        mostrarMensagem("Preencha seu nome, e-mail e telefone.", "erro");
        return;
    }

    mostrarMensagem("Marcando...", "");
    try {
        const resp = await api("/publico/agendamentos", {
            method: "POST",
            body: JSON.stringify({
                profissionalId,
                servicoId,
                clienteNome: nome,
                clienteEmail: email,
                clienteTelefone: telefone,
                inicio,
                observacoes: $("pub-obs").value.trim()
            })
        });
        // Mostra a confirmação.
        $("confirmacao-texto").textContent =
            `${resp.servico} com ${resp.profissional} em ${formatarDataHora(resp.inicio)}. ` +
            `Status: ${resp.status}. Você receberá a confirmação do profissional.`;
        $("confirmacao").classList.remove("oculto");
        mostrarMensagem("", "");
        // Limpa os campos de dados do cliente e recarrega os horários
        // (o horário marcado já não deve mais aparecer como livre).
        $("pub-nome").value = "";
        $("pub-email").value = "";
        $("pub-telefone").value = "";
        $("pub-obs").value = "";
        carregarHorarios();
    } catch (err) {
        mostrarMensagem(err.message, "erro");
    }
});

// Botão "Marcar outro" esconde a confirmação.
$("btn-novo").addEventListener("click", () => {
    $("confirmacao").classList.add("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// Inicializa.
carregarProfissionais();
