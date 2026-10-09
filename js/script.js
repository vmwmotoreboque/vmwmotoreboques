//==================================================
// VMW MOTO-REBOQUES - SCRIPT.JS (VERSÃO 4.1.0)
// LOCAL ONLINE + RETIRADA + ENTREGA + VOLTA BASE
// ENVIO DE GPS A CADA 10 SEGUNDOS
//==================================================

const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

// COORDENADAS DA BASE (VILA RICA 2095, CAIÇARA)
const BASE_LAT = -19.903006;
const BASE_LNG = -43.980724;

// INTERVALO DE ENVIO DO GPS (10 SEGUNDOS)
const GPS_INTERVALO = 10000; // 10.000 milissegundos = 10 segundos

//==============================================
// FORÇAR RECARGA DE CONFIGURAÇÕES
//==============================================

const VERSAO_SISTEMA = "4.1.0"; 
const versaoAtual = localStorage.getItem("vmw_versao");

if (versaoAtual !== VERSAO_SISTEMA) {
    console.log("🔄 Nova versão detectada! Limpando cache...");
    const chavesParaLimpar = [
        "ate20", "km20a40", "base40", "kmAcima40", 
        "cidade", "latitude", "longitude", "ultimaAtualizacao", "ultimaAtualizacaoGPS"
    ];
    chavesParaLimpar.forEach(chave => localStorage.removeItem(chave));
    localStorage.setItem("vmw_versao", VERSAO_SISTEMA);
    console.log("✅ Cache limpo! Versão atual:", VERSAO_SISTEMA);
}

//==============================================
// MAPA
//==============================================

const mapa = L.map("mapa-rota").setView([BASE_LAT, BASE_LNG], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(mapa);

let linhaRota = null;
let marcadorOrigem = null;
let marcadorDestino = null;
let marcadorReboque = null;
let watchId = null;
let intervaloGPS = null;

//==============================================
// ELEMENTOS
//==============================================

const nome = document.getElementById("nome");
const telefone = document.getElementById("telefone");
const moto = document.getElementById("moto");
const retirada = document.getElementById("retirada");
const entrega = document.getElementById("entrega");
const botao = document.getElementById("calcular");
const resultado = document.getElementById("resultado");
const km = document.getElementById("km");
const tempo = document.getElementById("tempo");
const valor = document.getElementById("valor");
const whatsapp = document.getElementById("enviarWhatsapp");

//==============================================
// CARREGAR CONFIGURAÇÕES
//==============================================

function carregarConfiguracoesLocais() {
    const config = {};
    
    config.gasolina = parseFloat(localStorage.getItem('gasolina')) || 5.80;
    config.consumo = parseFloat(localStorage.getItem('consumo')) || 9;
    config.depreciacao = parseFloat(localStorage.getItem('depreciacao')) || 0.50;
    config.manutencao = parseFloat(localStorage.getItem('manutencao')) || 0.30;
    
    config.preco_00_05 = parseFloat(localStorage.getItem('preco_00_05')) || 0;
    config.preco_05_0830 = parseFloat(localStorage.getItem('preco_05_0830')) || 0;
    config.preco_0831_14 = parseFloat(localStorage.getItem('preco_0831_14')) || 0;
    config.preco_14_18 = parseFloat(localStorage.getItem('preco_14_18')) || 0;
    config.preco_18_20 = parseFloat(localStorage.getItem('preco_18_20')) || 0;
    config.preco_20_22 = parseFloat(localStorage.getItem('preco_20_22')) || 0;
    config.preco_22_2359 = parseFloat(localStorage.getItem('preco_22_2359')) || 0;
    
    return config;
}

async function carregarLocalizacaoAPK() {
    // 1. Tentar da API (localização atual do APK)
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const config = await res.json();
            const lat = parseFloat(config.latitude);
            const lng = parseFloat(config.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                console.log("📍 Localização do APK (API):", lat, lng);
                localStorage.setItem("latitude", lat);
                localStorage.setItem("longitude", lng);
                return [lat, lng];
            }
        }
    } catch (e) {
        console.warn("⚠️ Não foi possível carregar localização da API:", e);
    }

    // 2. Tentar do LocalStorage
    const latLocal = parseFloat(localStorage.getItem("latitude"));
    const lngLocal = parseFloat(localStorage.getItem("longitude"));
    if (!isNaN(latLocal) && !isNaN(lngLocal)) {
        console.log("📍 Localização do APK (LocalStorage):", latLocal, lngLocal);
        return [latLocal, lngLocal];
    }

    // 3. Fallback: Base
    console.log("📍 Usando Base (Vila Rica) como fallback");
    return [BASE_LAT, BASE_LNG];
}

function obterFaixaHorario() {
    const agora = new Date();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const horaMinuto = hora * 60 + minuto;

    const faixas = [
        { inicio: 0, fim: 300, id: 'preco_00_05' },
        { inicio: 301, fim: 510, id: 'preco_05_0830' },
        { inicio: 511, fim: 840, id: 'preco_0831_14' },
        { inicio: 841, fim: 1080, id: 'preco_14_18' },
        { inicio: 1081, fim: 1200, id: 'preco_18_20' },
        { inicio: 1201, fim: 1320, id: 'preco_20_22' },
        { inicio: 1321, fim: 1439, id: 'preco_22_2359' }
    ];

    for (const faixa of faixas) {
        if (horaMinuto >= faixa.inicio && horaMinuto <= faixa.fim) {
            return faixa.id;
        }
    }
    return 'preco_00_05';
}

//==============================================
// FUNÇÕES DE CÁLCULO
//==============================================

async function buscarCoordenadas(endereco) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&limit=1&lang=pt&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const dados = await res.json();
    if (!dados.features || dados.features.length === 0) throw new Error("Endereço não encontrado: " + endereco);
    const coords = dados.features[0].geometry.coordinates;
    return [coords[1], coords[0]];
}

async function calcularRota(origem, destino) {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${origem[0]},${origem[1]}|${destino[0]},${destino[1]}&mode=drive&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const dados = await res.json();
    if (!dados.features) throw new Error("Erro ao calcular rota.");
    return dados;
}

//==============================================
// DESENHAR MAPA
//==============================================

function desenharMapa(rota, origem, destino) {
    if (linhaRota) { mapa.removeLayer(linhaRota); }
    if (marcadorOrigem) { mapa.removeLayer(marcadorOrigem); }
    if (marcadorDestino) { mapa.removeLayer(marcadorDestino); }
    if (marcadorReboque) { mapa.removeLayer(marcadorReboque); }

    linhaRota = L.geoJSON(rota, {
        style: { color: "#d60000", weight: 5, opacity: 0.9 }
    }).addTo(mapa);

    const iconeOrigem = L.divIcon({
        className: 'custom-marker-origem',
        html: `<div style="background: #4CAF50; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); position: relative;"><div style="width: 12px; height: 12px; background: white; border-radius: 50%; border: 2px solid #4CAF50;"></div><div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid #4CAF50;"></div></div>`,
        iconSize: [36, 48], iconAnchor: [18, 48], popupAnchor: [0, -45]
    });

    const iconeDestino = L.divIcon({
        className: 'custom-marker-destino',
        html: `<div style="background: #d60000; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); position: relative;"><div style="width: 12px; height: 12px; background: white; border-radius: 50%; border: 2px solid #d60000;"></div><div style="position: absolute; bottom: -12px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid #d60000;"></div></div>`,
        iconSize: [36, 48], iconAnchor: [18, 48], popupAnchor: [0, -45]
    });

    marcadorOrigem = L.marker(origem, { icon: iconeOrigem })
        .addTo(mapa)
        .bindPopup(`<div style="font-family: 'Poppins', sans-serif; padding: 5px;"><strong style="color: #4CAF50;">📍 Ponto de Retirada</strong><br><span style="font-size: 12px; color: #666;">${retirada.value || 'Origem'}</span></div>`);

    marcadorDestino = L.marker(destino, { icon: iconeDestino })
        .addTo(mapa)
        .bindPopup(`<div style="font-family: 'Poppins', sans-serif; padding: 5px;"><strong style="color: #d60000;">🏁 Ponto de Entrega</strong><br><span style="font-size: 12px; color: #666;">${entrega.value || 'Destino'}</span></div>`);

    const bounds = linhaRota.getBounds();
    mapa.fitBounds(bounds, { padding: [50, 50] });
}

//==============================================
// CALCULAR ORÇAMENTO
//==============================================

async function calcularOrcamento() {
    try {
        if (nome.value.trim() === "" || telefone.value.trim() === "" || moto.value === "" ||
            retirada.value.trim() === "" || entrega.value.trim() === "") {
            alert("Preencha todos os campos.");
            return;
        }
        botao.disabled = true;
        botao.innerHTML = "⏳ Calculando...";

        const origem = await buscarCoordenadas(retirada.value);
        const destino = await buscarCoordenadas(entrega.value);
        const base = [BASE_LAT, BASE_LNG];

        const reboquePos = await carregarLocalizacaoAPK();

        const rotaCliente = await calcularRota(origem, destino);
        const distanciaCliente = rotaCliente.features[0].properties.distance / 1000;
        const tempoCliente = rotaCliente.features[0].properties.time / 60;

        let distanciaAPK = 0;
        try {
            const rotaAPK = await calcularRota(reboquePos, origem);
            if (rotaAPK && rotaAPK.features && rotaAPK.features.length > 0) {
                distanciaAPK = rotaAPK.features[0].properties.distance / 1000;
            }
        } catch (e) { console.warn("⚠️ Erro rota APK:", e); }

        let distanciaVolta = 0;
        try {
            const rotaVolta = await calcularRota(destino, base);
            if (rotaVolta && rotaVolta.features && rotaVolta.features.length > 0) {
                distanciaVolta = rotaVolta.features[0].properties.distance / 1000;
            }
        } catch (e) { console.warn("⚠️ Erro rota volta:", e); }

        const distanciaTotal = distanciaAPK + distanciaCliente + distanciaVolta;
        const tempoTotal = tempoCliente;

        const config = carregarConfiguracoesLocais();
        const gasolina = config.gasolina;
        const consumo = config.consumo;
        const depreciacao = config.depreciacao;
        const manutencao = config.manutencao;

        const faixaId = obterFaixaHorario();
        const valorFaixa = config[faixaId] || 0;

        const custoCombustivel = (distanciaTotal / consumo) * gasolina;
        const custoDepreciacao = (depreciacao + manutencao) * distanciaTotal;
        const valorFinal = valorFaixa + custoCombustivel + custoDepreciacao;

        console.log("🧮 CÁLCULO DETALHADO:");
        console.log("KM Local Online -> Retirada:", distanciaAPK.toFixed(2));
        console.log("KM Retirada -> Entrega:", distanciaCliente.toFixed(2));
        console.log("KM Entrega -> Base:", distanciaVolta.toFixed(2));
        console.log("KM Total:", distanciaTotal.toFixed(2));
        console.log("VALOR FINAL:", valorFinal.toFixed(2));

        desenharMapa(rotaCliente, origem, destino);

        resultado.style.display = "block";
        km.innerHTML = distanciaTotal.toFixed(1) + " km (total)";
        tempo.innerHTML = Math.round(tempoTotal) + " min";
        valor.innerHTML = "R$ " + valorFinal.toFixed(2);

        const mensagem = `🚚 *NOVO ORÇAMENTO - VMW Moto-Reboques*\n\n👤 Nome: ${nome.value}\n📞 WhatsApp: ${telefone.value}\n🏍 Moto: ${moto.value}\n📍 Retirada: ${retirada.value}\n🏁 Entrega: ${entrega.value}\n📏 Distância Total: ${distanciaTotal.toFixed(1)} km\n⏱ Tempo estimado: ${Math.round(tempoTotal)} minutos\n💰 Valor: R$ ${valorFinal.toFixed(2)}`;
        
        whatsapp.href = "https://wa.me/5531996488546?text=" + encodeURIComponent(mensagem);
        // ==========================================
// ENVIAR ORÇAMENTO PARA A API (ADMIN)
// ==========================================
const dadosOrcamento = {
    data: new Date().toISOString(),
    nome: nome.value,
    telefone: telefone.value,
    moto: moto.value,
    retirada: retirada.value,
    entrega: entrega.value,
    kmTotal: distanciaTotal.toFixed(1),
    valor: valorFinal.toFixed(2),
    custo: (custoCombustivel + custoDepreciacao).toFixed(2),
    lucro: (valorFinal - (custoCombustivel + custoDepreciacao)).toFixed(2),
    status: "pendente"
};

try {
    const resposta = await fetch(API_URL + "/orcamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosOrcamento)
    });
    
    if (resposta.ok) {
        console.log("✅ Orçamento enviado para o Admin:", dadosOrcamento);
    } else {
        console.error("❌ Erro ao enviar orçamento para o Admin:", await resposta.text());
    }
} catch (e) {
    console.error("❌ Erro de rede ao enviar orçamento:", e);
}

        const dadosOrcamento = {
            data: new Date().toISOString(),
            nome: nome.value,
            telefone: telefone.value,
            moto: moto.value,
            retirada: retirada.value,
            entrega: entrega.value,
            kmTotal: distanciaTotal.toFixed(1),
            valor: valorFinal.toFixed(2),
            custo: (custoCombustivel + custoDepreciacao).toFixed(2),
            lucro: (valorFinal - (custoCombustivel + custoDepreciacao)).toFixed(2),
            status: "pendente"
        };

        try {
            await fetch(API_URL + "/orcamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dadosOrcamento)
            });
            console.log("✅ Orçamento enviado para o Admin");
        } catch (e) {
            console.warn("⚠️ Erro ao enviar orçamento:", e);
        }

    } catch (erro) {
        console.error("❌ ERRO NO CÁLCULO:", erro);
        alert("Erro: " + erro.message);
    } finally {
        botao.disabled = false;
        botao.innerHTML = "Calcular Orçamento";
    }
}

//==============================================
// AUTOCOMPLETE
//==============================================

function configurarAutocomplete(campoId, listaId) {
    const campo = document.getElementById(campoId);
    const lista = document.getElementById(listaId);
    let timeout = null;
    campo.addEventListener("input", () => {
        clearTimeout(timeout);
        const texto = campo.value.trim();
        if (texto.length < 3) { lista.style.display = "none"; return; }
        timeout = setTimeout(async () => {
            try {
                const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(texto)}&limit=5&lang=pt&apiKey=${API_KEY}`;
                const res = await fetch(url);
                const dados = await res.json();
                lista.innerHTML = "";
                if (!dados.features || dados.features.length === 0) { lista.style.display = "none"; return; }
                dados.features.forEach(local => {
                    const item = document.createElement("div");
                    item.className = "item-endereco";
                    item.innerHTML = "📍 " + local.properties.formatted;
                    item.onclick = () => { campo.value = local.properties.formatted; lista.style.display = "none"; };
                    lista.appendChild(item);
                });
                lista.style.display = "block";
            } catch (e) { console.error("Autocomplete:", e); }
        }, 300);
    });
}

//==============================================
// GPS - APENAS PARA O APK (ENVIA A CADA 10 SEGUNDOS)
//==============================================

function obterGeolocation() {
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.Geolocation) {
        return Capacitor.Plugins.Geolocation;
    }
    if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Geolocation) {
        return window.Capacitor.Plugins.Geolocation;
    }
    return null;
}

async function enviarPosicao(position) {
    try {
        const c = position.coords;

        const config = {
            latitude: c.latitude,
            longitude: c.longitude,
            velocidade: c.speed || 0,
            direcao: c.heading || 0,
            precisao: c.accuracy || 0,
            altitude: c.altitude || 0,
            status: "online",
            cidade: localStorage.getItem('cidade') || 'Belo Horizonte'
        };

        console.log("📤 Enviando GPS para a API:", config);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });

        if (!response.ok) {
            console.error("Erro do Worker:", await response.json());
            return;
        }

        localStorage.setItem("latitude", config.latitude);
        localStorage.setItem("longitude", config.longitude);
        localStorage.setItem("ultimaAtualizacaoGPS", Date.now().toString());

        console.log("✅ GPS enviado com sucesso");

    } catch (e) {
        console.error("❌ Erro ao enviar posição:", e);
    }
}

async function iniciarRastreamento() {
    console.log("📱 Iniciando rastreamento GPS (APK)...");

    try {
        if (typeof Capacitor === 'undefined' && typeof window.Capacitor === 'undefined') {
            console.log('🌐 Capacitor não disponível - modo navegador (sem GPS)');
            return;
        }

        const capacitor = Capacitor || window.Capacitor;
        if (!capacitor.isNativePlatform()) {
            console.log('🌐 Modo navegador - GPS desativado');
            return;
        }

        const geolocation = obterGeolocation();
        if (!geolocation) {
            console.error('❌ Plugin Geolocation não disponível');
            return;
        }

        console.log("✅ Plugin Geolocation disponível");

        const perms = await geolocation.checkPermissions();
        console.log("📱 Permissões:", perms);
        
        if (perms.location !== 'granted') {
            console.log("⏳ Solicitando permissão...");
            const result = await geolocation.requestPermissions();
            if (result.location !== 'granted') {
                console.warn('⚠️ Permissão de localização negada!');
                return;
            }
        }

        console.log("✅ Permissão concedida");
        console.log(`⏳ Iniciando envio a cada ${GPS_INTERVALO / 1000} segundos...`);

        // Envia imediatamente a primeira posição
        const primeiraPos = await geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
        await enviarPosicao(primeiraPos);

        // Envia a cada X segundos (intervalo definido)
        intervaloGPS = setInterval(async () => {
            try {
                const pos = await geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
                await enviarPosicao(pos);
            } catch (e) {
                console.warn("⚠️ Erro ao obter posição no intervalo:", e);
            }
        }, GPS_INTERVALO);

        console.log(`✅ Rastreamento GPS iniciado! Enviando a cada ${GPS_INTERVALO / 1000} segundos.`);

    } catch (error) {
        console.error('❌ Erro ao iniciar rastreamento:', error);
    }
}

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener("DOMContentLoaded", async () => {
    try {
        console.log("🚀 Inicializando VMW Moto-Reboques...");
        console.log("🚀 VERSÃO 4.1.0 - GPS A CADA 10 SEGUNDOS");

        carregarConfiguracoesLocais();
        console.log("✅ Configurações carregadas");

        const capacitor = (typeof Capacitor !== 'undefined') ? Capacitor : 
                          (typeof window.Capacitor !== 'undefined') ? window.Capacitor : null;

        if (capacitor && capacitor.isNativePlatform()) {
            console.log("📱 APK detectado - Iniciando GPS...");
            await iniciarRastreamento();
        } else {
            console.log("🌐 Modo navegador - GPS desativado");
        }

        console.log("✅ App VMW Moto-Reboques pronto!");

    } catch(e) {
        console.error("❌ ERRO:", e);
    }
});

//==============================================
// EVENTOS
//==============================================

botao.addEventListener("click", calcularOrcamento);
configurarAutocomplete("retirada", "listaRetirada");
configurarAutocomplete("entrega", "listaEntrega");
document.getElementById("formOrcamento").addEventListener("submit", (e) => { e.preventDefault(); calcularOrcamento(); });