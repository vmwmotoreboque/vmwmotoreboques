//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (SIMPLIFICADO)
// APENAS LOGIN, CONFIGURAÇÕES E EXIBIÇÃO
//==================================================

const SENHA = "vmw2026";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

//==============================================
// VARIÁVEIS GLOBAIS
//==============================================

let carregando = false;

//==============================================
// ELEMENTOS
//==============================================

const telaLogin = document.querySelector(".login");
const painel = document.getElementById("painel");
const campoSenha = document.getElementById("senha");
const erro = document.getElementById("erro");
const btnEntrar = document.getElementById("entrar");
const btnSair = document.getElementById("sair");
const btnSalvar = document.getElementById("salvar");
const btnAtualizar = document.getElementById("atualizarLocalizacao");

//==============================================
// FUNÇÃO: CARREGAR DADOS DO WORKER (COM CONTROLE DE CONCORRÊNCIA)
//==============================================

async function carregarConfiguracoes() {
    // Evita chamadas simultâneas
    if (carregando) {
        console.log("⏳ Carregamento já em andamento...");
        return;
    }

    carregando = true;

    try {
        const res = await fetch(API_URL);

        if (!res.ok) throw new Error("Cloudflare offline");

        const cfg = await res.json();

        // Preços
        document.getElementById("ate20").value = cfg.ate20 || 0;
        document.getElementById("km20a40").value = cfg.km20a40 || 0;
        document.getElementById("base40").value = cfg.base40 || 0;
        document.getElementById("kmAcima40").value = cfg.kmAcima40 || 0;

        // Localização (com verificação de null)
        document.getElementById("cidade").innerHTML = cfg.cidade || "--";
        
        document.getElementById("lat").innerHTML =
            cfg.latitude != null
                ? Number(cfg.latitude).toFixed(6)
                : "--";
        
        document.getElementById("lon").innerHTML =
            cfg.longitude != null
                ? Number(cfg.longitude).toFixed(6)
                : "--";
        
        // Status
        if (document.getElementById("statusGPS")) {
            document.getElementById("statusGPS").innerHTML = cfg.status || "offline";
        }

        // Status Cloudflare
        if (document.getElementById("statusCloud")) {
            document.getElementById("statusCloud").innerHTML = "✅ Conectado";
            document.getElementById("statusCloud").style.color = "#1ecb5a";
        }

        console.log("📊 Dados carregados:", new Date().toLocaleTimeString());

    } catch (e) {
        console.error("Erro ao carregar:", e);
        if (document.getElementById("statusCloud")) {
            document.getElementById("statusCloud").innerHTML = "❌ Offline";
            document.getElementById("statusCloud").style.color = "#d60000";
        }
    } finally {
        carregando = false;
    }
}

//==============================================
// FUNÇÃO: SALVAR PREÇOS NO WORKER
//==============================================

async function salvarCloudflare() {
    try {
        // 1. Carregar configuração atual primeiro
        const resAtual = await fetch(API_URL);
        if (!resAtual.ok) throw new Error("Não foi possível carregar dados atuais");
        
        const atual = await resAtual.json();

        // 2. Criar config preservando todos os campos e atualizando apenas os preços
        const config = {
            ...atual,
            ate20: Number(document.getElementById("ate20").value),
            km20a40: Number(document.getElementById("km20a40").value),
            base40: Number(document.getElementById("base40").value),
            kmAcima40: Number(document.getElementById("kmAcima40").value)
        };

        // 3. Enviar para o Worker
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });

        if (!res.ok) throw new Error("Falha ao salvar");
        
        btnSalvar.innerHTML = "✅ Salvo!";
        setTimeout(() => {
            btnSalvar.innerHTML = "💾 Salvar Configurações";
        }, 3000);
        
        console.log("✅ Configurações salvas com sucesso.");
        return true;

    } catch (e) {
        console.error("Erro ao salvar:", e);
        btnSalvar.innerHTML = "❌ Erro!";
        setTimeout(() => {
            btnSalvar.innerHTML = "💾 Salvar Configurações";
        }, 3000);
        return false;
    }
}

//==============================================
// FUNÇÃO: VERIFICAR STATUS
//==============================================

async function verificarStatus() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            document.getElementById("statusCloud").innerHTML = "✅ Online";
            document.getElementById("statusCloud").style.color = "#1ecb5a";
        } else {
            document.getElementById("statusCloud").innerHTML = "⚠️ Problema";
            document.getElementById("statusCloud").style.color = "#ff6b00";
        }
    } catch (e) {
        document.getElementById("statusCloud").innerHTML = "❌ Offline";
        document.getElementById("statusCloud").style.color = "#d60000";
    }
}

//==============================================
// FUNÇÃO: SALVAR SESSÃO
//==============================================

function salvarSessao() {
    localStorage.setItem("sessaoAtiva", "true");
    localStorage.setItem("ultimaSessao", new Date().toISOString());
}

//==============================================
// FUNÇÃO: RESTAURAR SESSÃO (CORRIGIDA)
//==============================================

function restaurarSessao() {
    const sessaoAtiva = localStorage.getItem("sessaoAtiva");
    if (sessaoAtiva === "true") {
        console.log("🔄 Restaurando sessão...");
        telaLogin.style.display = "none";
        painel.style.display = "block";
        
        // Executa carregamento sequencial para evitar concorrência
        (async () => {
            await carregarConfiguracoes();
            await verificarStatus();
        })();
        
        return true;
    }
    return false;
}

//==============================================
// EVENTO: LOGIN (AGORA ASSÍNCRONO)
//==============================================

btnEntrar.addEventListener("click", async () => {
    if (campoSenha.value === SENHA) {
        // Esconde login primeiro
        telaLogin.style.display = "none";
        painel.style.display = "block";
        erro.style.display = "none";
        
        // Carrega dados (aguarda conclusão)
        await carregarConfiguracoes();
        await verificarStatus();
        
        salvarSessao();
        
        console.log("🔓 Login efetuado - Dados carregados");
        
    } else {
        erro.style.display = "block";
        campoSenha.value = "";
        campoSenha.focus();
    }
});

campoSenha.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnEntrar.click();
});

//==============================================
// EVENTO: SAIR
//==============================================

btnSair.addEventListener("click", () => {
    localStorage.setItem("sessaoAtiva", "false");
    painel.style.display = "none";
    telaLogin.style.display = "flex";
    campoSenha.value = "";
    erro.style.display = "none";
    console.log("🔒 Sessão encerrada");
});

//==============================================
// EVENTO: ATUALIZAR DADOS
//==============================================

btnAtualizar.addEventListener("click", async () => {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = "⏳ Atualizando...";
    
    await carregarConfiguracoes();
    await verificarStatus();
    
    btnAtualizar.innerHTML = "✅ Atualizado!";
    setTimeout(() => {
        btnAtualizar.disabled = false;
        btnAtualizar.innerHTML = "🔄 Atualizar dados";
    }, 2000);
});

//==============================================
// EVENTO: SALVAR CONFIGURAÇÕES
//==============================================

btnSalvar.addEventListener("click", async () => {
    await salvarCloudflare();
    await carregarConfiguracoes(); // Recarregar para confirmar
});

//==============================================
// ATUALIZAÇÃO AUTOMÁTICA (CADA 5 SEGUNDOS)
//==============================================

setInterval(carregarConfiguracoes, 5000);
setInterval(verificarStatus, 30000);

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener("DOMContentLoaded", () => {
    // Tentar restaurar sessão
    const logado = restaurarSessao();
    
    if (!logado) {
        // Se não estiver logado, mostrar tela de login
        telaLogin.style.display = "flex";
        painel.style.display = "none";
    }
    
    console.log("✅ ADMIN.JS CARREGADO (SIMPLIFICADO)");
});