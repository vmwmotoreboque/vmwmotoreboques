//==================================================
// VMW MOTO-REBOQUES - SCRIPT.JS (COMPLETO)
// COM MARCADORES ESTILO GOOGLE MAPS
//==================================================

const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

//==============================================
// FORÇAR RECARGA DE CONFIGURAÇÕES
//==============================================

const VERSAO_SISTEMA = "2.0.1";
const versaoAtual = localStorage.getItem("vmw_versao");

if (versaoAtual !== VERSAO_SISTEMA) {
    console.log("🔄 Nova versão detectada! Limpando cache...");
    const chavesParaLimpar = [
        "ate20", "km20a40", "base40", "kmAcima40", 
        "cidade", "latitude", "longitude", "ultimaAtualizacao"
    ];
    chavesParaLimpar.forEach(chave => localStorage.removeItem(chave));
    localStorage.setItem("vmw_versao", VERSAO_SISTEMA);
    console.log("✅ Cache limpo! Versão atual:", VERSAO_SISTEMA);
}

//==============================================
// MAPA
//==============================================

const mapa = L.map("mapa-rota").setView([-19.9167, -43.9345], 11);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
}).addTo(mapa);

let linhaRota = null;
let marcadorOrigem = null;
let marcadorDestino = null;
let marcadorReboque = null;

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

async function carregarConfiguracoesCloudflare() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Falha");
        const config = await res.json();
        Object.keys(config).forEach(key => localStorage.setItem(key, config[key]));
        console.log("✅ Config carregada");
    } catch (e) {
        console.error("❌ Erro ao carregar Cloudflare:", e);
        if (!localStorage.getItem("ate20")) {
            localStorage.setItem("ate20", "120");
            localStorage.setItem("km20a40", "2");
            localStorage.setItem("base40", "150");
            localStorage.setItem("kmAcima40", "2.5");
        }
    }
}

function obterLocalizacaoReboque() {
    const lat = parseFloat(localStorage.getItem("latitude"));
    const lng = parseFloat(localStorage.getItem("longitude"));
    return (isNaN(lat) || isNaN(lng)) ? null : [lat, lng];
}

async function buscarCoordenadas(endereco) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&limit=1&lang=pt&apiKey=${API_KEY}`;
    const res = await fetch(url);
    const dados = await res.json();
    if (!dados.features || dados.features.length === 0) throw new Error("Endereço não encontrado.");
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
// DESENHAR MAPA COM MARCADORES ESTILO GOOGLE
//==============================================

function desenharMapa(rota, origem, destino, reboquePos) {
    // Limpar layers anteriores
    if (linhaRota) { mapa.removeLayer(linhaRota); }
    if (marcadorOrigem) { mapa.removeLayer(marcadorOrigem); }
    if (marcadorDestino) { mapa.removeLayer(marcadorDestino); }
    if (marcadorReboque) { mapa.removeLayer(marcadorReboque); }

    // Desenhar rota
    linhaRota = L.geoJSON(rota, {
        style: { 
            color: "#d60000", 
            weight: 5,
            opacity: 0.9
        }
    }).addTo(mapa);

    // ===========================================
    // MARCADOR DE ORIGEM (VERDE)
    // ===========================================
    const iconeOrigem = L.divIcon({
        className: 'custom-marker-origem',
        html: `
            <div style="
                background: #4CAF50;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                position: relative;
            ">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    border: 2px solid #4CAF50;
                "></div>
                <div style="
                    position: absolute;
                    bottom: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 12px solid #4CAF50;
                "></div>
            </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -45]
    });

    // ===========================================
    // MARCADOR DE DESTINO (VERMELHO)
    // ===========================================
    const iconeDestino = L.divIcon({
        className: 'custom-marker-destino',
        html: `
            <div style="
                background: #d60000;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                position: relative;
            ">
                <div style="
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    border: 2px solid #d60000;
                "></div>
                <div style="
                    position: absolute;
                    bottom: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 12px solid #d60000;
                "></div>
            </div>
        `,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -45]
    });

    // ===========================================
    // MARCADOR DO REBOQUE (AZUL COM ANIMAÇÃO)
    // ===========================================
    const iconeReboque = L.divIcon({
        className: 'custom-marker-reboque',
        html: `
            <div style="
                background: #1a73e8;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 15px rgba(26, 115, 232, 0.5);
                position: relative;
                animation: pulse-blue 1.5s infinite;
            ">
                <i class="fa-solid fa-truck" style="color: white; font-size: 20px;"></i>
                <div style="
                    position: absolute;
                    bottom: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 12px solid #1a73e8;
                "></div>
            </div>
        `,
        iconSize: [44, 56],
        iconAnchor: [22, 56],
        popupAnchor: [0, -50]
    });

    // Adicionar marcadores ao mapa
    marcadorOrigem = L.marker(origem, { icon: iconeOrigem })
        .addTo(mapa)
        .bindPopup(`
            <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
                <strong style="color: #4CAF50;">📍 Ponto de Retirada</strong>
                <br>
                <span style="font-size: 12px; color: #666;">${retirada.value || 'Origem'}</span>
            </div>
        `);

    marcadorDestino = L.marker(destino, { icon: iconeDestino })
        .addTo(mapa)
        .bindPopup(`
            <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
                <strong style="color: #d60000;">🏁 Ponto de Entrega</strong>
                <br>
                <span style="font-size: 12px; color: #666;">${entrega.value || 'Destino'}</span>
            </div>
        `);

    if (reboquePos) {
        marcadorReboque = L.marker(reboquePos, { icon: iconeReboque })
            .addTo(mapa)
            .bindPopup(`
                <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
                    <strong style="color: #1a73e8;">🚚 Posição do Reboque</strong>
                    <br>
                    <span style="font-size: 12px; color: #666;">Atualizado em tempo real</span>
                </div>
            `);
    }

    // Ajustar zoom para mostrar todos os marcadores
    const bounds = linhaRota.getBounds();
    if (reboquePos) {
        bounds.extend(reboquePos);
    }
    mapa.fitBounds(bounds, { padding: [50, 50] });
}

//==============================================
// CALCULAR PREÇO VMW
//==============================================

function calcularPrecoVMW(distanciaTotal) {
    const ate20 = parseFloat(localStorage.getItem("ate20") || 120);
    const km20a40 = parseFloat(localStorage.getItem("km20a40") || 2);
    const base40 = parseFloat(localStorage.getItem("base40") || 150);
    const kmAcima40 = parseFloat(localStorage.getItem("kmAcima40") || 2.5);
    if (distanciaTotal <= 20) return ate20;
    if (distanciaTotal <= 40) return ate20 + ((distanciaTotal - 20) * km20a40);
    return base40 + ((distanciaTotal - 40) * kmAcima40);
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
        const rota = await calcularRota(origem, destino);
        const distanciaCliente = rota.features[0].properties.distance / 1000;
        const tempoCliente = rota.features[0].properties.time / 60;

        const reboquePos = obterLocalizacaoReboque();
        let distanciaReboque = 0, tempoReboque = 0;
        if (reboquePos) {
            try {
                const rotaReboque = await calcularRota(reboquePos, origem);
                if (rotaReboque && rotaReboque.features && rotaReboque.features.length > 0) {
                    distanciaReboque = rotaReboque.features[0].properties.distance / 1000;
                    tempoReboque = rotaReboque.features[0].properties.time / 60;
                }
            } catch (e) { console.warn("Erro rota reboque:", e); }
        }

        const distanciaTotal = distanciaCliente + distanciaReboque;
        const tempoTotal = tempoCliente + tempoReboque;
        const preco = calcularPrecoVMW(distanciaTotal);

        desenharMapa(rota, origem, destino, reboquePos);

        resultado.style.display = "block";
        km.innerHTML = distanciaTotal.toFixed(1) + " km";
        tempo.innerHTML = Math.round(tempoTotal) + " min";
        valor.innerHTML = "R$ " + preco.toFixed(2);

        const mensagem = `🚚 *NOVO ORÇAMENTO - VMW Moto-Reboques*\n\n👤 Nome: ${nome.value}\n📞 WhatsApp: ${telefone.value}\n🏍 Moto: ${moto.value}\n📍 Retirada: ${retirada.value}\n🏁 Entrega: ${entrega.value}\n📏 Distância: ${distanciaTotal.toFixed(1)} km\n⏱ Tempo estimado: ${Math.round(tempoTotal)} minutos\n💰 Valor: R$ ${preco.toFixed(2)}`;
        whatsapp.href = "https://wa.me/5531996488546?text=" + encodeURIComponent(mensagem);

    } catch (erro) {
        console.error("❌ Erro:", erro);
        alert("Não foi possível calcular a rota. Verifique os endereços.");
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
// EVENTOS
//==============================================

botao.addEventListener("click", calcularOrcamento);
configurarAutocomplete("retirada", "listaRetirada");
configurarAutocomplete("entrega", "listaEntrega");
document.getElementById("formOrcamento").addEventListener("submit", (e) => { e.preventDefault(); calcularOrcamento(); });

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Inicializando VMW...");
    await carregarConfiguracoesCloudflare();

    const reboquePos = obterLocalizacaoReboque();
    if (reboquePos && mapa) {
        // Criar marcador bonito para a posição inicial do reboque
        const iconeInicial = L.divIcon({
            className: 'custom-marker-reboque',
            html: `
                <div style="
                    background: #1a73e8;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid white;
                    box-shadow: 0 2px 15px rgba(26, 115, 232, 0.5);
                    position: relative;
                    animation: pulse-blue 1.5s infinite;
                ">
                    <i class="fa-solid fa-truck" style="color: white; font-size: 20px;"></i>
                    <div style="
                        position: absolute;
                        bottom: -12px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 12px solid #1a73e8;
                    "></div>
                </div>
            `,
            iconSize: [44, 56],
            iconAnchor: [22, 56],
            popupAnchor: [0, -50]
        });

        L.marker(reboquePos, { icon: iconeInicial })
            .addTo(mapa)
            .bindPopup(`
                <div style="font-family: 'Poppins', sans-serif; padding: 5px;">
                    <strong style="color: #1a73e8;">🚚 Posição do Reboque</strong>
                    <br>
                    <span style="font-size: 12px; color: #666;">Localização atual</span>
                </div>
            `);
        mapa.setView(reboquePos, 13);
    }

    console.log("✅ Tudo pronto!");
});