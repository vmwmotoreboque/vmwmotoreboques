//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (ULTRA POWER)
// GPS NUNCA PARA - NUNCA DESLOGA
//==================================================

const SENHA = "vmw2026";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

//==============================================
// VARIÁVEIS GLOBAIS
//==============================================

let keepAliveInterval = null;
let isPageVisible = true;

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
const statusGPS = document.getElementById("statusGPS");

//==============================================
// FUNÇÃO: SALVAR NA CLOUDFLARE
//==============================================

async function salvarCloudflare() {
    try {
        const config = {
            ate20: document.getElementById("ate20").value,
            km20a40: document.getElementById("km20a40").value,
            base40: document.getElementById("base40").value,
            kmAcima40: document.getElementById("kmAcima40").value,
            cidade: localStorage.getItem("cidade") || "Belo Horizonte"
        };
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error("Falha ao salvar");
        
        btnSalvar.innerHTML = "✅ Configurações salvas";
        console.log("✅ Configurações enviadas.");
        return true;
    } catch (e) {
        console.error("Erro ao salvar:", e);
        return false;
    }
}

//==============================================
// FUNÇÃO: INICIAR GPS (SUBSTITUTO)
//==============================================

function iniciarGPS() {
    // Função removida - GPS desabilitado
    console.log("⚠️ GPS desabilitado - Admin removido");
    if (statusGPS) {
        statusGPS.innerHTML = "⚠️ GPS desabilitado";
        statusGPS.style.color = "#ff6b00";
    }
    btnAtualizar.innerHTML = "⛔ GPS desativado";
}

//==============================================
// FUNÇÃO: REINICIAR GPS (SUBSTITUTO)
//==============================================

function reiniciarGPS() {
    console.log("⚠️ GPS desabilitado - Não é possível reiniciar");
    // Função removida
}

//==============================================
// FUNÇÃO: FALLBACK TIMER (SUBSTITUTO)
//==============================================

function iniciarFallbackTimer() {
    console.log("⚠️ Fallback desabilitado - GPS removido");
    // Função removida
}

//==============================================
// FUNÇÃO: KEEP-ALIVE (NUNCA DESLOGA)
//==============================================

function iniciarKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    
    keepAliveInterval = setInterval(() => {
        if (painel.style.display === "block") {
            // 1. Disparar evento de scroll (mantém a página "ativa")
            document.dispatchEvent(new Event('scroll'));
            
            // 2. Tentar manter a tela ligada (se possível)
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen').catch(() => {});
            }
            
            console.log("💓 Keep-alive: " + new Date().toLocaleTimeString());
        }
    }, 5000); // A CADA 5 SEGUNDOS (mais agressivo)
    
    console.log("💓 Keep-alive iniciado (5s)");
}

//==============================================
// FUNÇÃO: RESTAURAR SESSÃO (SE PERDER)
//==============================================

function restaurarSessao() {
    // Verificar se já estava logado
    const sessaoAtiva = localStorage.getItem("sessaoAtiva");
    if (sessaoAtiva === "true") {
        console.log("🔄 Restaurando sessão anterior...");
        // GPS desabilitado
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
// EVENTO: VISIBILIDADE DA PÁGINA
//==============================================

document.addEventListener("visibilitychange", () => {
    isPageVisible = !document.hidden;
    
    if (isPageVisible) {
        console.log("📱 Página visível - GPS desabilitado");
        // GPS desabilitado
    } else {
        console.log("📱 Página oculta - GPS desabilitado");
    }
});

//==============================================
// FUNÇÃO: CARREGAR CONFIGURAÇÕES
//==============================================

async function carregarConfiguracoes() {
    try {
        const res = await fetch(API_URL);

        if (!res.ok) throw new Error("Cloudflare offline");

        const cfg = await res.json();

        document.getElementById("ate20").value = cfg.ate20;
        document.getElementById("km20a40").value = cfg.km20a40;
        document.getElementById("base40").value = cfg.base40;
        document.getElementById("kmAcima40").value = cfg.kmAcima40;

        document.getElementById("cidade").innerHTML =
            cfg.cidade || "--";

        document.getElementById("lat").innerHTML =
            Number(cfg.latitude).toFixed(6);

        document.getElementById("lon").innerHTML =
            Number(cfg.longitude).toFixed(6);

        if (document.getElementById("statusGPS")) {
            document.getElementById("statusGPS").innerHTML =
                cfg.status || "offline";
        }

    } catch (e) {
        console.error(e);
    }
}

// Atualização automática a cada 5 segundos
setInterval(carregarConfiguracoes, 5000);

//==============================================
// FUNÇÃO: VERIFICAR STATUS CLOUDFLARE
//==============================================

async function verificarStatus() {
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            document.getElementById("statusCloud").innerHTML = "✅ Conectado";
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
setInterval(verificarStatus, 60000);

//==============================================
// EVENTO: LOGIN
//==============================================

btnEntrar.addEventListener("click", () => {
    if (campoSenha.value === SENHA) {
        telaLogin.style.display = "none";
        painel.style.display = "block";
        erro.style.display = "none";
        
        carregarConfiguracoes();
        iniciarGPS(); // Substituído
        iniciarFallbackTimer(); // Substituído
        iniciarKeepAlive();
        salvarSessao();
        
        // WakeLock
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(() => {
                console.log("💡 Tela não vai apagar!");
            }).catch(() => {});
        }
        
        verificarStatus();
        console.log("🔓 Login efetuado - GPS DESABILITADO!");
        
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
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
    localStorage.setItem("sessaoAtiva", "false");
    painel.style.display = "none";
    telaLogin.style.display = "flex";
    campoSenha.value = "";
    console.log("🔒 Sessão encerrada");
});

//==============================================
// EVENTO: ATUALIZAR LOCALIZAÇÃO (MANUAL - DESABILITADO)
//==============================================

btnAtualizar.addEventListener("click", () => {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = "⛔ GPS desativado";
    setTimeout(() => {
        btnAtualizar.disabled = false;
        btnAtualizar.innerHTML = "⛔ GPS desativado";
    }, 2000);
});

//==============================================
// EVENTO: SALVAR CONFIGURAÇÕES
//==============================================

btnSalvar.addEventListener("click", async () => {
    const ok = await salvarCloudflare();
    alert(ok ? "✅ Configurações salvas!" : "❌ Erro ao salvar.");
});

//==============================================
// RESTAURAR SESSÃO (AO CARREGAR A PÁGINA)
//==============================================

document.addEventListener("DOMContentLoaded", () => {
    restaurarSessao();
    console.log("✅ ADMIN.JS CARREGADO - GPS DESABILITADO!");
});

console.log("✅ ADMIN.JS - GPS DESABILITADO!");
// Mantém a tela ligada enquanto estiver no admin
if (window.location.pathname.includes('admin.html')) {
    // Impede que a tela apague
    setInterval(() => {
        document.dispatchEvent(new Event('scroll'));
    }, 3000);
}