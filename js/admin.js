//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS CORRIGIDO
//==================================================

//==============================
// CONFIGURAÇÕES
//==============================

const SENHA = "vmw2026";
const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

let watchId = null;
let gpsTimer = null;
let ultimaLatitudeEnviada = null;
let ultimaLongitudeEnviada = null;
const DISTANCIA_MINIMA = 100;
let contadorAtualizacoes = 0;

//==============================
// ELEMENTOS
//==============================

const telaLogin = document.querySelector(".login");
const painel = document.getElementById("painel");
const campoSenha = document.getElementById("senha");
const erro = document.getElementById("erro");
const btnEntrar = document.getElementById("entrar");
const btnSair = document.getElementById("sair");
const btnSalvar = document.getElementById("salvar");
const btnAtualizar = document.getElementById("atualizarLocalizacao");

//==============================
// FUNÇÕES AUXILIARES
//==============================

function distanciaEmMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

//==============================
// BUSCAR CIDADE
//==============================

async function buscarCidade(lat, lon) {
    try {
        const resposta = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`
        );
        const dados = await resposta.json();
        if (!dados.features || dados.features.length === 0) return;
        
        const info = dados.features[0].properties;
        const cidade = info.city || info.town || info.village || info.county || "Não encontrada";
        
        document.getElementById("cidade").innerHTML = cidade;
        localStorage.setItem("cidade", cidade);
        
        return cidade;
    } catch (erro) {
        console.log("Erro ao buscar cidade:", erro);
        return null;
    }
}

//==============================
// SALVAR NA CLOUDFLARE
//==============================

async function salvarConfiguracaoCloudflare(latitude, longitude) {
    try {
        const configuracao = {
            ate20: document.getElementById("ate20").value,
            km20a40: document.getElementById("km20a40").value,
            base40: document.getElementById("base40").value,
            kmAcima40: document.getElementById("kmAcima40").value,
            cidade: localStorage.getItem("cidade") || "Belo Horizonte",
            latitude: latitude,
            longitude: longitude
        };

        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configuracao)
        });

        if (!resposta.ok) throw new Error("Erro na resposta");

        ultimaLatitudeEnviada = latitude;
        ultimaLongitudeEnviada = longitude;
        contadorAtualizacoes++;

        const now = new Date().toLocaleTimeString("pt-BR");
        btnSalvar.innerHTML = `✅ Salvo em ${now} (${contadorAtualizacoes}x)`;
        
        console.log(`📤 Configuração salva (${contadorAtualizacoes}x)`);
        return true;
    } catch (erro) {
        console.error("Erro ao salvar:", erro);
        return false;
    }
}

//==============================
// ATUALIZAR POSIÇÃO GPS
//==============================

async function atualizarPosicaoGPS() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta geolocalização.");
        return;
    }

    btnAtualizar.innerHTML = "⏳ Obtendo localização...";
    btnAtualizar.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (posicao) => {
            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            document.getElementById("lat").innerHTML = latitude.toFixed(6);
            document.getElementById("lon").innerHTML = longitude.toFixed(6);
            localStorage.setItem("latitude", latitude);
            localStorage.setItem("longitude", longitude);

            await buscarCidade(latitude, longitude);

            let enviar = false;
            if (ultimaLatitudeEnviada === null || ultimaLongitudeEnviada === null) {
                enviar = true;
            } else {
                const distancia = distanciaEmMetros(
                    ultimaLatitudeEnviada,
                    ultimaLongitudeEnviada,
                    latitude,
                    longitude
                );
                if (distancia >= DISTANCIA_MINIMA) {
                    enviar = true;
                }
            }

            if (enviar) {
                await salvarConfiguracaoCloudflare(latitude, longitude);
            }

            const now = new Date().toLocaleTimeString("pt-BR");
            btnAtualizar.innerHTML = `🔄 Atualizado ${now}`;
            btnAtualizar.disabled = false;

            console.log(`📍 Posição: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        },
        (erro) => {
            console.error("Erro GPS:", erro);
            btnAtualizar.innerHTML = "❌ Falha - Clique para tentar";
            btnAtualizar.disabled = false;
            alert("Não foi possível obter sua localização.");
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000
        }
    );
}

//==============================
// INICIAR GPS AUTOMÁTICO (30s)
//==============================

function iniciarGPSAutomatico() {
    if (!navigator.geolocation) {
        alert("Seu navegador não suporta geolocalização.");
        return;
    }

    // Primeira atualização imediata
    setTimeout(atualizarPosicaoGPS, 1000);

    // Timer a cada 30 segundos
    if (gpsTimer) {
        clearInterval(gpsTimer);
    }

    gpsTimer = setInterval(atualizarPosicaoGPS, 30000);

    console.log("🔄 GPS automático iniciado - 30 segundos");
}

//==============================
// CARREGAR CONFIGURAÇÕES
//==============================

function carregarConfiguracoes() {
    document.getElementById("ate20").value = localStorage.getItem("ate20") || 120;
    document.getElementById("km20a40").value = localStorage.getItem("km20a40") || 2;
    document.getElementById("base40").value = localStorage.getItem("base40") || 150;
    document.getElementById("kmAcima40").value = localStorage.getItem("kmAcima40") || 2.5;
    document.getElementById("cidade").innerHTML = localStorage.getItem("cidade") || "Não definida";
    document.getElementById("lat").innerHTML = localStorage.getItem("latitude") || "--";
    document.getElementById("lon").innerHTML = localStorage.getItem("longitude") || "--";
}

//==============================
// LOGIN
//==============================

btnEntrar.addEventListener("click", () => {
    if (campoSenha.value === SENHA) {
        telaLogin.style.display = "none";
        painel.style.display = "block";
        erro.style.display = "none";
        
        carregarConfiguracoes();
        iniciarGPSAutomatico();
    } else {
        erro.style.display = "block";
        campoSenha.value = "";
        campoSenha.focus();
    }
});

campoSenha.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnEntrar.click();
});

//==============================
// SAIR
//==============================

btnSair.addEventListener("click", () => {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    if (gpsTimer) {
        clearInterval(gpsTimer);
        gpsTimer = null;
    }
    
    painel.style.display = "none";
    telaLogin.style.display = "flex";
    campoSenha.value = "";
    
    console.log("🔒 Sessão encerrada");
});

//==============================
// EVENTOS
//==============================

btnAtualizar.addEventListener("click", atualizarPosicaoGPS);

btnSalvar.addEventListener("click", async () => {
    const latitude = parseFloat(localStorage.getItem("latitude"));
    const longitude = parseFloat(localStorage.getItem("longitude"));
    
    if (isNaN(latitude) || isNaN(longitude)) {
        alert("⚠️ Localização não disponível. Atualize a localização primeiro.");
        return;
    }
    
    const sucesso = await salvarConfiguracaoCloudflare(latitude, longitude);
    
    if (sucesso) {
        alert("✅ Configurações salvas na Cloudflare!");
    } else {
        alert("❌ Erro ao salvar na Cloudflare.");
    }
});

//==============================
// VERIFICAR STATUS
//==============================

async function verificarStatus() {
    try {
        const resposta = await fetch(API_URL);
        if (resposta.ok) {
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

console.log("✅ ADMIN.JS CARREGADO!");