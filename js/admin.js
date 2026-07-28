//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (FINAL)
//==================================================

const SENHA = "vmw2026";
const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

let watchId = null, gpsTimer = null;
let ultimaLatEnviada = null, ultimaLonEnviada = null;
const DIST_MIN = 100; // metros
let contador = 0;
let paginaVisivel = true;

const telaLogin = document.querySelector(".login");
const painel = document.getElementById("painel");
const campoSenha = document.getElementById("senha");
const erro = document.getElementById("erro");
const btnEntrar = document.getElementById("entrar");
const btnSair = document.getElementById("sair");
const btnSalvar = document.getElementById("salvar");
const btnAtualizar = document.getElementById("atualizarLocalizacao");
const statusGPS = document.getElementById("statusGPS");

function distanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

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

async function salvarCloudflare(lat, lon) {
    try {
        const config = {
            ate20: document.getElementById("ate20").value,
            km20a40: document.getElementById("km20a40").value,
            base40: document.getElementById("base40").value,
            kmAcima40: document.getElementById("kmAcima40").value,
            cidade: localStorage.getItem("cidade") || "Belo Horizonte",
            latitude: lat,
            longitude: lon
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
        const now = new Date().toLocaleTimeString("pt-BR");
        btnSalvar.innerHTML = `✅ Salvo em ${now} (${contador}x)`;
        console.log(`📤 Salvo (${contador}x)`);
        return true;
    } catch (e) {
        console.error("Erro ao salvar:", e);
        return false;
    }
}

async function processarPosicao(pos) {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    document.getElementById("lat").innerHTML = lat.toFixed(6);
    document.getElementById("lon").innerHTML = lon.toFixed(6);
    localStorage.setItem("latitude", lat);
    localStorage.setItem("longitude", lon);

    await buscarCidade(lat, lon);

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
    console.log(`📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

function erroGPS(err) {
    console.error("Erro GPS:", err);
    btnAtualizar.innerHTML = "❌ Falha - Clique para tentar";
    if (statusGPS) {
        statusGPS.innerHTML = `⚠️ Erro: ${err.message}`;
        statusGPS.style.color = "#ff6b00";
    }
    btnAtualizar.disabled = false;
}

function iniciarWatchGPS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta geolocalização.");
        return;
    }
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    watchId = navigator.geolocation.watchPosition(
        processarPosicao,
        erroGPS,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    console.log("🔄 Watch GPS iniciado");
    if (statusGPS) {
        statusGPS.innerHTML = "🔄 Aguardando GPS...";
        statusGPS.style.color = "#ffaa00";
    }
    btnAtualizar.innerHTML = "🔄 GPS em execução";
}

function iniciarFallbackTimer() {
    if (gpsTimer) clearInterval(gpsTimer);
    gpsTimer = setInterval(() => {
        if (!paginaVisivel) return;
        if (watchId !== null) return;
        navigator.geolocation.getCurrentPosition(processarPosicao, erroGPS, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });
    }, 30000);
    console.log("⏱️ Fallback timer iniciado (30s)");
}

document.addEventListener("visibilitychange", () => {
    paginaVisivel = !document.hidden;
    if (paginaVisivel) {
        console.log("📱 Página visível - reiniciando GPS");
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        iniciarWatchGPS();
    } else {
        console.log("📱 Página oculta - GPS continua em background");
    }
});

function carregarConfiguracoes() {
    document.getElementById("ate20").value = localStorage.getItem("ate20") || 120;
    document.getElementById("km20a40").value = localStorage.getItem("km20a40") || 2;
    document.getElementById("base40").value = localStorage.getItem("base40") || 150;
    document.getElementById("kmAcima40").value = localStorage.getItem("kmAcima40") || 2.5;
    document.getElementById("cidade").innerHTML = localStorage.getItem("cidade") || "Não definida";
    document.getElementById("lat").innerHTML = localStorage.getItem("latitude") || "--";
    document.getElementById("lon").innerHTML = localStorage.getItem("longitude") || "--";
}

btnEntrar.addEventListener("click", () => {
    if (campoSenha.value === SENHA) {
        telaLogin.style.display = "none";
        painel.style.display = "block";
        erro.style.display = "none";
        carregarConfiguracoes();
        iniciarWatchGPS();
        iniciarFallbackTimer();
        verificarStatus();
    } else {
        erro.style.display = "block";
        campoSenha.value = "";
        campoSenha.focus();
    }
});
campoSenha.addEventListener("keypress", (e) => { if (e.key === "Enter") btnEntrar.click(); });

btnSair.addEventListener("click", () => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (gpsTimer) { clearInterval(gpsTimer); gpsTimer = null; }
    painel.style.display = "none";
    telaLogin.style.display = "flex";
    campoSenha.value = "";
    console.log("🔒 Sessão encerrada");
});

btnAtualizar.addEventListener("click", () => {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = "⏳ Obtendo...";
    navigator.geolocation.getCurrentPosition(
        (pos) => { processarPosicao(pos); btnAtualizar.disabled = false; },
        (err) => { erroGPS(err); btnAtualizar.disabled = false; },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

btnSalvar.addEventListener("click", async () => {
    const lat = parseFloat(localStorage.getItem("latitude"));
    const lon = parseFloat(localStorage.getItem("longitude"));
    if (isNaN(lat) || isNaN(lon)) {
        alert("⚠️ Localização não disponível. Aguarde o GPS.");
        return;
    }
    const ok = await salvarCloudflare(lat, lon);
    alert(ok ? "✅ Salvo!" : "❌ Erro ao salvar.");
});

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

console.log("✅ ADMIN.JS FINAL CARREGADO!");