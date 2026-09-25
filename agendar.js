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

// Ao trocar de profissional, recarrega os serviços dele.
$("pub-profissional").addEventListener("change", (e) => {
    carregarServicos(e.target.value);
});

// -----------------------------------------------------------------------
// Marcar o horário.
// -----------------------------------------------------------------------
$("btn-marcar").addEventListener("click", async () => {
    const profissionalId = Number($("pub-profissional").value);
    const servicoId = Number($("pub-servico").value);
    let inicio = $("pub-inicio").value;

    if (!profissionalId || !servicoId) {
        mostrarMensagem("Escolha o profissional e o serviço.", "erro");
        return;
    }
    if (!inicio) {
        mostrarMensagem("Escolha a data e hora.", "erro");
        return;
    }
    if (inicio.length === 16) inicio += ":00"; // completa para ISO

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
        // Limpa os campos de dados do cliente.
        $("pub-nome").value = "";
        $("pub-email").value = "";
        $("pub-telefone").value = "";
        $("pub-obs").value = "";
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
