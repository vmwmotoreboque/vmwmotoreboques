//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (ULTRA POWER)
// GPS NUNCA PARA - NUNCA DESLOGA
//==================================================

const SENHA = "vmw2026";
const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

//==============================================
// VARIÁVEIS GLOBAIS
//==============================================

let watchId = null;
let gpsTimer = null;
let keepAliveInterval = null;
let ultimaLatEnviada = null;
let ultimaLonEnviada = null;
let contador = 0;
const DIST_MIN = 50; // 50 metros (mais sensível)
let tentativasReconexao = 0;
const MAX_TENTATIVAS = 20;
let ultimoPing = Date.now();
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
// FUNÇÃO: DISTÂNCIA EM METROS
//==============================================

function distanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

//==============================================
// FUNÇÃO: BUSCAR CIDADE
//==============================================

async function buscarCidade(lat, lon) {
    try {
        const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`;
        const res = await fetch(url);
        const dados = await res.json();
        if (!dados.features || dados.features.length === 0) return;
        const info = dados.features[0].properties;
        const cidade = info.city || info.town || info.village || info.county || "Não encontrada";
        document.getElementById("cidade").innerHTML = cidade;
        localStorage.setItem("cidade", cidade);
    } catch (e) { console.log("Erro cidade:", e); }
}

//==============================================
// FUNÇÃO: SALVAR NA CLOUDFLARE
//==============================================

async function salvarCloudflare(lat, lon) {
    try {
        const config = {
            ate20: document.getElementById("ate20").value,
            km20a40: document.getElementById("km20a40").value,
            base40: document.getElementById("base40").value,
            kmAcima40: document.getElementById("kmAcima40").value,
            cidade: localStorage.getItem("cidade") || "Belo Horizonte",
            latitude: lat,
            longitude: lon,
            ultimaAtualizacao: new Date().toISOString()
        };
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error("Falha ao salvar");
        ultimaLatEnviada = lat;
        ultimaLonEnviada = lon;
        contador++;
        localStorage.setItem("ultimaAtualizacaoGPS", Date.now().toString());
        const now = new Date().toLocaleTimeString("pt-BR");
        btnSalvar.innerHTML = `✅ Salvo em ${now} (${contador}x)`;
        console.log(`📤 Salvo (${contador}x) - ${lat}, ${lon}`);
        return true;
    } catch (e) {
        console.error("Erro ao salvar:", e);
        return false;
    }
}

//==============================================
// FUNÇÃO: PROCESSAR POSIÇÃO (PRINCIPAL)
//==============================================

async function processarPosicao(pos) {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    
    // Atualizar UI
    document.getElementById("lat").innerHTML = lat.toFixed(6);
    document.getElementById("lon").innerHTML = lon.toFixed(6);
    localStorage.setItem("latitude", lat);
    localStorage.setItem("longitude", lon);
    
    // Salvar localmente a cada 5 segundos (backup)
    localStorage.setItem("ultimaPosicao", JSON.stringify({ lat, lon, hora: new Date().toISOString() }));

    await buscarCidade(lat, lon);

    // Verificar se deve enviar para Cloudflare
    let enviar = false;
    if (ultimaLatEnviada === null || ultimaLonEnviada === null) {
        enviar = true;
    } else {
        const dist = distanciaMetros(ultimaLatEnviada, ultimaLonEnviada, lat, lon);
        if (dist >= DIST_MIN) enviar = true;
    }
    
    if (enviar) await salvarCloudflare(lat, lon);

    const now = new Date().toLocaleTimeString("pt-BR");
    btnAtualizar.innerHTML = `🔄 Atualizado ${now}`;
    if (statusGPS) {
        statusGPS.innerHTML = `✅ GPS ativo (${now})`;
        statusGPS.style.color = "#1ecb5a";
    }
    tentativasReconexao = 0;
    ultimoPing = Date.now();
    console.log(`📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

//==============================================
// FUNÇÃO: ERRO GPS
//==============================================

function erroGPS(err) {
    console.error("Erro GPS:", err);
    btnAtualizar.innerHTML = "❌ Falha - Clique para tentar";
    if (statusGPS) {
        statusGPS.innerHTML = `⚠️ Erro: ${err.message}`;
        statusGPS.style.color = "#ff6b00";
    }
    btnAtualizar.disabled = false;
    // Tentar reconectar após erro
    setTimeout(reiniciarGPS, 3000);
}

//==============================================
// FUNÇÃO: INICIAR WATCH GPS
//==============================================

function iniciarWatchGPS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta geolocalização.");
        return;
    }
    
    // Parar watch anterior
    if (watchId !== null) {
        try {
            navigator.geolocation.clearWatch(watchId);
        } catch(e) {}
        watchId = null;
    }
    
    // Iniciar novo watch
    watchId = navigator.geolocation.watchPosition(
        processarPosicao,
        erroGPS,
        { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 3000  // 3 segundos (mais sensível)
        }
    );
    
    console.log("🔄 Watch GPS iniciado (ID:" + watchId + ")");
    if (statusGPS) {
        statusGPS.innerHTML = "🔄 Aguardando GPS...";
        statusGPS.style.color = "#ffaa00";
    }
    btnAtualizar.innerHTML = "🔄 GPS em execução";
}

//==============================================
// FUNÇÃO: REINICIAR GPS
//==============================================

function reiniciarGPS() {
    console.log("🔄 Reiniciando GPS... (tentativa " + (tentativasReconexao + 1) + ")");
    
    if (watchId !== null) {
        try {
            navigator.geolocation.clearWatch(watchId);
        } catch(e) {}
        watchId = null;
    }
    
    tentativasReconexao++;
    if (tentativasReconexao > MAX_TENTATIVAS) {
        console.error("❌ Máximo de tentativas! Usando fallback...");
        tentativasReconexao = 0;
        // Usar fallback com getCurrentPosition
        if (gpsTimer) clearInterval(gpsTimer);
        gpsTimer = setInterval(() => {
            navigator.geolocation.getCurrentPosition(processarPosicao, erroGPS, { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 3000 
            });
        }, 5000);
        return;
    }
    
    setTimeout(() => {
        iniciarWatchGPS();
        // Forçar uma atualização imediata
        navigator.geolocation.getCurrentPosition(processarPosicao, erroGPS, { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        });
    }, 2000);
}

//==============================================
// FUNÇÃO: FALLBACK TIMER (SALVA-GUARDA)
//==============================================

function iniciarFallbackTimer() {
    if (gpsTimer) clearInterval(gpsTimer);
    
    gpsTimer = setInterval(() => {
        // Se o watch está ativo, não faz nada
        if (watchId !== null) return;
        if (!isPageVisible) return;
        
        console.log("⏱️ Fallback: obtendo posição...");
        navigator.geolocation.getCurrentPosition(
            processarPosicao, 
            erroGPS, 
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    }, 10000); // A cada 10 segundos (mais frequente)
    
    console.log("⏱️ Fallback timer iniciado (10s)");
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
            
            // 2. Verificar se o GPS está rodando
            const agora = Date.now();
            if (agora - ultimoPing > 30000) {
                console.warn("⚠️ GPS pode ter parado! Verificando...");
                if (watchId === null) {
                    reiniciarGPS();
                } else {
                    // Forçar atualização
                    navigator.geolocation.getCurrentPosition(processarPosicao, erroGPS, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                }
            }
            
            // 3. Tentar manter a tela ligada (se possível)
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
        // Tentar reativar o GPS
        if (painel.style.display === "block") {
            iniciarWatchGPS();
        }
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
        console.log("📱 Página visível - verificando GPS");
        // Verificar se o GPS está rodando
        if (watchId === null) {
            reiniciarGPS();
        } else {
            // Forçar atualização
            navigator.geolocation.getCurrentPosition(processarPosicao, erroGPS, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    } else {
        console.log("📱 Página oculta - GPS continua em background");
    }
});

//==============================================
// FUNÇÃO: CARREGAR CONFIGURAÇÕES
//==============================================

function carregarConfiguracoes() {
    document.getElementById("ate20").value = localStorage.getItem("ate20") || 120;
    document.getElementById("km20a40").value = localStorage.getItem("km20a40") || 2;
    document.getElementById("base40").value = localStorage.getItem("base40") || 150;
    document.getElementById("kmAcima40").value = localStorage.getItem("kmAcima40") || 2.5;
    document.getElementById("cidade").innerHTML = localStorage.getItem("cidade") || "Não definida";
    document.getElementById("lat").innerHTML = localStorage.getItem("latitude") || "--";
    document.getElementById("lon").innerHTML = localStorage.getItem("longitude") || "--";
}

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
        iniciarWatchGPS();
        iniciarFallbackTimer();
        iniciarKeepAlive();
        salvarSessao();
        
        // WakeLock
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(() => {
                console.log("💡 Tela não vai apagar!");
            }).catch(() => {});
        }
        
        // Tentar restaurar posição anterior
        const ultimaPos = localStorage.getItem("ultimaPosicao");
        if (ultimaPos) {
            try {
                const pos = JSON.parse(ultimaPos);
                document.getElementById("lat").innerHTML = pos.lat.toFixed(6);
                document.getElementById("lon").innerHTML = pos.lon.toFixed(6);
            } catch(e) {}
        }
        
        verificarStatus();
        console.log("🔓 Login efetuado - GPS NUNCA PARA!");
        
        // Verificar se o GPS está rodando após 5 segundos
        setTimeout(() => {
            if (watchId === null) {
                console.warn("⚠️ GPS não iniciou! Tentando novamente...");
                reiniciarGPS();
            }
        }, 5000);
        
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
    if (watchId !== null) {
        try {
            navigator.geolocation.clearWatch(watchId);
        } catch(e) {}
        watchId = null;
    }
    if (gpsTimer) {
        clearInterval(gpsTimer);
        gpsTimer = null;
    }
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
// EVENTO: ATUALIZAR LOCALIZAÇÃO (MANUAL)
//==============================================

btnAtualizar.addEventListener("click", () => {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = "⏳ Obtendo...";
    navigator.geolocation.getCurrentPosition(
        (pos) => { 
            processarPosicao(pos); 
            btnAtualizar.disabled = false;
            btnAtualizar.innerHTML = "✅ Atualizado!";
            setTimeout(() => {
                btnAtualizar.innerHTML = "🔄 Atualizar localização";
            }, 3000);
        },
        (err) => { 
            erroGPS(err); 
            btnAtualizar.disabled = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

//==============================================
// EVENTO: SALVAR CONFIGURAÇÕES
//==============================================

btnSalvar.addEventListener("click", async () => {
    const lat = parseFloat(localStorage.getItem("latitude"));
    const lon = parseFloat(localStorage.getItem("longitude"));
    if (isNaN(lat) || isNaN(lon)) {
        alert("⚠️ Localização não disponível. Aguarde o GPS.");
        return;
    }
    const ok = await salvarCloudflare(lat, lon);
    alert(ok ? "✅ Salvo na Cloudflare!" : "❌ Erro ao salvar.");
});

//==============================================
// RESTAURAR SESSÃO (AO CARREGAR A PÁGINA)
//==============================================

document.addEventListener("DOMContentLoaded", () => {
    restaurarSessao();
    console.log("✅ ADMIN.JS ULTRA POWER CARREGADO!");
});

//==============================================
// TIMER: VERIFICAR SE O GPS ESTÁ ATIVO (A CADA 15s)
//==============================================

setInterval(() => {
    if (painel.style.display === "block") {
        const agora = Date.now();
        if (agora - ultimoPing > 45000) { // 45 segundos sem atualização
            console.warn("⚠️ GPS parou há muito tempo! Reiniciando...");
            reiniciarGPS();
        }
    }
}, 15000);

console.log("✅ ADMIN.JS ULTRA POWER - GPS NUNCA PARA!");