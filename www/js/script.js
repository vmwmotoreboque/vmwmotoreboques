//==================================================
// VMW MOTO-REBOQUES - SCRIPT.JS (VERSÃO 8.2.0)
// CORRIGIDO: TOGGLE DE LOCALIZAÇÃO (LEITURA GARANTIDA)
//==================================================

const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

const BASE_LAT = -19.903006;
const BASE_LNG = -43.980724;

const GPS_INTERVALO = 30000;

//==============================================
// FORÇAR RECARGA DE CONFIGURAÇÕES
//==============================================

const VERSAO_SISTEMA = "8.3.2"; 
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
// FUNÇÃO: VERIFICAR MODO DE LOCALIZAÇÃO
//==============================================

function isModoAPK() {
    // A chave principal tem prioridade. Se ainda não houver escolha salva,
    // o sistema tenta usar o GPS recente do APK automaticamente.
    const modo1 = localStorage.getItem("modo_localizacao");
    const modo2 = localStorage.getItem("modoLocalizacao");
    const modo3 = localStorage.getItem("modo");

    let modo;
    if (modo1 !== null) {
        modo = modo1 === "true";
    } else if (modo2 !== null) {
        modo = modo2 === "true";
    } else if (modo3 !== null) {
        modo = modo3 === "true";
    } else {
        // Primeira utilização: tentar GPS do APK; se não estiver recente,
        // carregarLocalizacaoAPK informará o problema em vez de usar GPS velho.
        modo = true;
    }

    console.log("📍 Modo de localização escolhido:", modo ? "APK" : "Vila Rica (fixo)");
    return modo;
}

//==============================================
// CARREGAR CONFIGURAÇÕES
//==============================================

async function carregarConfiguracoes() {
    console.log("📡 Buscando configurações da API...");
    
    try {
        const res = await fetch(API_URL);
        if (res.ok) {
            const apiConfig = await res.json();
            console.log("✅ Configurações recebidas da API:", apiConfig);
            
            const config = {
                gasolina: parseFloat(apiConfig.gasolina) || 5.80,
                consumo: parseFloat(apiConfig.consumo) || 9,
                depreciacao: parseFloat(apiConfig.depreciacao) || 0.50,
                manutencao: parseFloat(apiConfig.manutencao) || 0.30,
                preco_00_05: parseFloat(apiConfig.preco_00_05) || 0,
                preco_05_0830: parseFloat(apiConfig.preco_05_0830) || 0,
                preco_0831_14: parseFloat(apiConfig.preco_0831_14) || 0,
                preco_14_18: parseFloat(apiConfig.preco_14_18) || 0,
                preco_18_20: parseFloat(apiConfig.preco_18_20) || 0,
                preco_20_22: parseFloat(apiConfig.preco_20_22) || 0,
                preco_22_2359: parseFloat(apiConfig.preco_22_2359) || 0
            };
            
            Object.keys(config).forEach(key => {
                localStorage.setItem(key, config[key]);
            });
            
            console.log("💾 Configurações salvas no LocalStorage");
            return config;
        }
    } catch (e) {
        console.warn("⚠️ Erro ao carregar da API:", e.message);
    }
    
    console.log("📋 Usando configurações do LocalStorage (fallback)...");
    const config = {
        gasolina: parseFloat(localStorage.getItem('gasolina')) || 5.80,
        consumo: parseFloat(localStorage.getItem('consumo')) || 9,
        depreciacao: parseFloat(localStorage.getItem('depreciacao')) || 0.50,
        manutencao: parseFloat(localStorage.getItem('manutencao')) || 0.30,
        preco_00_05: parseFloat(localStorage.getItem('preco_00_05')) || 0,
        preco_05_0830: parseFloat(localStorage.getItem('preco_05_0830')) || 0,
        preco_0831_14: parseFloat(localStorage.getItem('preco_0831_14')) || 0,
        preco_14_18: parseFloat(localStorage.getItem('preco_14_18')) || 0,
        preco_18_20: parseFloat(localStorage.getItem('preco_18_20')) || 0,
        preco_20_22: parseFloat(localStorage.getItem('preco_20_22')) || 0,
        preco_22_2359: parseFloat(localStorage.getItem('preco_22_2359')) || 0
    };
    
    return config;
}

async function carregarLocalizacaoAPK() {
    // Se o modo fixo foi selecionado, preserve o comportamento anterior.
    if (!isModoAPK()) {
        console.log("🏠 Modo Vila Rica ativado (localização fixa)");
        return [BASE_LAT, BASE_LNG];
    }

    // O site deve continuar calculando mesmo quando o APK estiver fechado.
    // Nesse caso, usa a base Vila Rica como alternativa, sem bloquear o orçamento.
    try {
        console.log("📍 Modo APK: consultando GPS no Worker...");

        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error("O Worker não respondeu corretamente.");

        const config = await res.json();
        const lat = Number(config.latitude);
        const lng = Number(config.longitude);
        let gpsTimestamp = Number(config.gpsAtualizadoEm);

        // Aceita timestamp em segundos ou milissegundos.
        if (Number.isFinite(gpsTimestamp) && gpsTimestamp > 0 && gpsTimestamp < 1e12) {
            gpsTimestamp *= 1000;
        }

        if (
            !Number.isFinite(lat) || !Number.isFinite(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180
        ) {
            throw new Error("O Worker não tem coordenadas GPS válidas.");
        }

        if (!Number.isFinite(gpsTimestamp) || gpsTimestamp <= 0) {
            throw new Error("O Worker não informou o horário da última atualização do GPS.");
        }

        const idadeGPS = Date.now() - gpsTimestamp;
        const idadeMaxima = 2 * 60 * 1000;

        console.log("🛰️ GPS recebido do Worker:", {
            latitude: lat,
            longitude: lng,
            atualizadoEm: new Date(gpsTimestamp).toLocaleString(),
            idadeSegundos: Math.round(idadeGPS / 1000),
            status: config.status
        });

        if (idadeGPS < -30000 || idadeGPS > idadeMaxima) {
            throw new Error("GPS antigo; será usada a base Vila Rica como alternativa.");
        }

        if (config.status && config.status !== "online") {
            throw new Error("APK offline; será usada a base Vila Rica como alternativa.");
        }

        localStorage.setItem("latitude", String(lat));
        localStorage.setItem("longitude", String(lng));
        localStorage.setItem("ultimaAtualizacaoGPS", String(gpsTimestamp));

        console.log("✅ Usando GPS atual do APK como origem do reboque.");
        return [lat, lng];
    } catch (erro) {
        console.warn("⚠️ GPS do APK indisponível ou desatualizado:", erro.message);
        console.warn("🏠 Alternativa ativada: usando base fixa Vila Rica para permitir o orçamento.");
        return [BASE_LAT, BASE_LNG];
    }
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



function normalizarTexto(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

async function buscarCoordenadas(endereco) {
    const texto = String(endereco || "").trim();

    if (!texto) {
        throw new Error("Informe o endereço completo.");
    }

    // 1. Prioriza as coordenadas exatas escolhidas no autocomplete.
    const campo = [...document.querySelectorAll("input")]
        .find(el => el.value.trim() === texto && el.dataset.lat && el.dataset.lon);

    if (campo) {
        const lat = Number(campo.dataset.lat);
        const lon = Number(campo.dataset.lon);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            console.log("📍 Coordenadas selecionadas no autocomplete:", {
                endereco: texto,
                latitude: lat,
                longitude: lon
            });

            return [lat, lon];
        }
    }

    // 2. Se não houve seleção no autocomplete, pesquisa o endereço.
    const url =
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(texto)}` +
        `&limit=5&lang=pt&filter=countrycode:br` +
        `&bias=proximity:-43.94,-19.92&apiKey=${API_KEY}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error(`Erro ao pesquisar endereço (${resposta.status}).`);
    }

    const dados = await resposta.json();

    if (!dados.features || dados.features.length === 0) {
        throw new Error("Endereço não encontrado: " + texto);
    }

    const solicitado = normalizarTexto(texto);
    const pedeBH =
        solicitado.includes("belo horizonte") ||
        /\bbh\b/.test(solicitado);

    // Não aceita Juiz de Fora quando o pedido é Belo Horizonte.
    let resultado = dados.features.find(item => {
        const p = item.properties || {};
        const cidade = normalizarTexto(p.city || p.municipality || "");
        const formatado = normalizarTexto(p.formatted || "");

        if (pedeBH) {
            return cidade === "belo horizonte" ||
                formatado.includes("belo horizonte");
        }

        return true;
    });

    if (!resultado) {
        console.error("❌ Cidade incompatível com o endereço solicitado:", {
            enderecoSolicitado: texto,
            resultados: dados.features.map(item => item.properties?.formatted)
        });

        throw new Error(
            "O endereço foi localizado em outra cidade. " +
            "Confira o endereço e selecione uma opção correta na lista."
        );
    }

    const props = resultado.properties;
    const coords = resultado.geometry.coordinates;
    const longitude = Number(coords[0]);
    const latitude = Number(coords[1]);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 ||
        longitude < -180 || longitude > 180
    ) {
        throw new Error("A API retornou coordenadas inválidas.");
    }

    console.log("📍 ENDEREÇO SOLICITADO:", texto);
    console.log("📍 ENDEREÇO ENCONTRADO:", props.formatted);
    console.log("📍 CIDADE ENCONTRADA:", props.city || props.municipality || "Não informada");
    console.log("📍 COORDENADAS:", { latitude, longitude });

    return [latitude, longitude];
}

async function calcularRota(origem, destino) {
    const url =
        `https://api.geoapify.com/v1/routing?waypoints=${origem[0]},${origem[1]}|${destino[0]},${destino[1]}&mode=drive&apiKey=${API_KEY}`;

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(
            `Erro no serviço de rotas (${res.status}).`
        );
    }

    const dados = await res.json();

    if (!dados.features || dados.features.length === 0) {
        throw new Error("O serviço não encontrou uma rota válida.");
    }

    const propriedades = dados.features[0].properties;
    const distancia = Number(propriedades.distance);
    const tempo = Number(propriedades.time);

    if (
        !Number.isFinite(distancia) ||
        distancia <= 0 ||
        !Number.isFinite(tempo) ||
        tempo <= 0
    ) {
        throw new Error("O serviço retornou uma rota com dados inválidos.");
    }

    console.log("🛣️ ROTA CALCULADA:", {
        origem,
        destino,
        distanciaKm: (distancia / 1000).toFixed(2),
        tempoMinutos: (tempo / 60).toFixed(1)
    });

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

        const config = await carregarConfiguracoes();
        
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
        console.log("Modo:", isModoAPK() ? "APK (localização atual)" : "Vila Rica (fixo)");
        console.log("KM Local Online -> Retirada:", distanciaAPK.toFixed(2));
        console.log("KM Retirada -> Entrega:", distanciaCliente.toFixed(2));
        console.log("KM Entrega -> Base:", distanciaVolta.toFixed(2));
        console.log("KM Total:", distanciaTotal.toFixed(2));
        console.log("Faixa:", faixaId, "Valor:", valorFaixa);
        console.log("Gasolina:", gasolina, "Consumo:", consumo);
        console.log("VALOR FINAL:", valorFinal.toFixed(2));

        desenharMapa(rotaCliente, origem, destino);

        resultado.style.display = "block";
        km.innerHTML = distanciaTotal.toFixed(1) + " km (total)";
        tempo.innerHTML = Math.round(tempoTotal) + " min";
        valor.innerHTML = "R$ " + valorFinal.toFixed(2);

        const mensagem = `🚚 *NOVO ORÇAMENTO - VMW Moto-Reboques*\n\n👤 Nome: ${nome.value}\n📞 WhatsApp: ${telefone.value}\n🏍 Moto: ${moto.value}\n📍 Retirada: ${retirada.value}\n🏁 Entrega: ${entrega.value}\n📏 Distância Total: ${distanciaTotal.toFixed(1)} km\n⏱ Tempo estimado: ${Math.round(tempoTotal)} minutos\n💰 Valor: R$ ${valorFinal.toFixed(2)}`;
        
        whatsapp.href = "https://wa.me/5531996488546?text=" + encodeURIComponent(mensagem);

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
                console.log("✅ Orçamento enviado para o Admin");
            } else {
                console.error("❌ Erro ao enviar orçamento:", await resposta.text());
            }
        } catch (e) {
            console.error("❌ Erro de rede ao enviar orçamento:", e);
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


async function configurarAutocomplete(campoId, listaId) {
    const campo = document.getElementById(campoId);
    const lista = document.getElementById(listaId);

    if (!campo || !lista) {
        console.error("Campo ou lista de autocomplete não encontrados:", campoId, listaId);
        return;
    }

    let timeout = null;

    campo.addEventListener("input", () => {
        // Ao digitar novamente, invalida as coordenadas da seleção anterior.
        delete campo.dataset.lat;
        delete campo.dataset.lon;

        clearTimeout(timeout);

        const texto = campo.value.trim();

        if (texto.length < 3) {
            lista.style.display = "none";
            return;
        }

        timeout = setTimeout(async () => {
            try {
                const url =
                    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(texto)}` +
                    `&limit=5&lang=pt&filter=countrycode:br` +
                    `&bias=proximity:-43.94,-19.92&apiKey=${API_KEY}`;

                const resposta = await fetch(url);

                if (!resposta.ok) {
                    throw new Error(`Erro no autocomplete (${resposta.status}).`);
                }

                const dados = await resposta.json();
                lista.innerHTML = "";

                if (!dados.features || dados.features.length === 0) {
                    lista.style.display = "none";
                    return;
                }

                dados.features.forEach(local => {
                    const item = document.createElement("div");
                    item.className = "item-endereco";
                    item.textContent = "📍 " + local.properties.formatted;

                    item.addEventListener("click", () => {
                        const coords = local.geometry.coordinates;

                        campo.value = local.properties.formatted;
                        campo.dataset.lat = String(coords[1]);
                        campo.dataset.lon = String(coords[0]);

                        lista.style.display = "none";

                        console.log("✅ Endereço selecionado:", {
                            endereco: campo.value,
                            cidade: local.properties.city || local.properties.municipality || "",
                            latitude: campo.dataset.lat,
                            longitude: campo.dataset.lon
                        });
                    });

                    lista.appendChild(item);
                });

                lista.style.display = "block";
            } catch (erro) {
                console.error("Erro no autocomplete:", erro);
                lista.style.display = "none";
            }
        }, 300);
    });

    // Fecha a lista ao clicar fora do campo e das sugestões.
    document.addEventListener("click", evento => {
        if (!campo.contains(evento.target) && !lista.contains(evento.target)) {
            lista.style.display = "none";
        }
    });
}


//==============================================
// GPS - APENAS PARA O APK
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
            cidade: localStorage.getItem('cidade') || 'Belo Horizonte',
            gpsAtualizadoEm: Date.now()
            
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

        const primeiraPos = await geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        });
        await enviarPosicao(primeiraPos);

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
        console.log("🚀 VERSÃO 8.3.2 - FALLBACK VILA RICA QUANDO APK OFFLINE");

        await carregarConfiguracoes();
        console.log("✅ Configurações carregadas");
        console.log("📍 Modo:", isModoAPK() ? "APK (localização atual)" : "Vila Rica (fixo)");

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