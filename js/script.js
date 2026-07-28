//==================================================
// VMW MOTO-REBOQUES - SCRIPT.JS CORRIGIDO
//==================================================

//==============================================
// CONFIGURAÇÃO
//==============================================

const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

//==============================================
// MAPA
//==============================================

const mapa = L.map("mapa-rota").setView(
    [-19.9167, -43.9345],
    11
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "© OpenStreetMap"
    }
).addTo(mapa);

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
// CARREGAR CONFIGURAÇÕES DA CLOUDFLARE
//==============================================

async function carregarConfiguracoesCloudflare() {
    try {
        const resposta = await fetch(API_URL);
        const config = await resposta.json();
        
        localStorage.setItem("ate20", config.ate20);
        localStorage.setItem("km20a40", config.km20a40);
        localStorage.setItem("base40", config.base40);
        localStorage.setItem("kmAcima40", config.kmAcima40);
        localStorage.setItem("cidade", config.cidade);
        localStorage.setItem("latitude", config.latitude);
        localStorage.setItem("longitude", config.longitude);
        
        console.log("✅ Configuração carregada da Cloudflare");
        return config;
    } catch (e) {
        console.error("❌ Erro ao carregar Cloudflare:", e);
        localStorage.setItem("ate20", "120");
        localStorage.setItem("km20a40", "2");
        localStorage.setItem("base40", "150");
        localStorage.setItem("kmAcima40", "2.5");
        return null;
    }
}

//==============================================
// OBTER LOCALIZAÇÃO DO REBOQUE
//==============================================

function obterLocalizacaoReboque() {
    const latitude = parseFloat(localStorage.getItem("latitude"));
    const longitude = parseFloat(localStorage.getItem("longitude"));
    
    if (isNaN(latitude) || isNaN(longitude)) {
        return null;
    }
    
    return [latitude, longitude];
}

//==============================================
// BUSCAR COORDENADAS
//==============================================

async function buscarCoordenadas(endereco) {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&limit=1&lang=pt&apiKey=${API_KEY}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();
    
    if (!dados.features || dados.features.length === 0) {
        throw new Error("Endereço não encontrado.");
    }
    
    const coords = dados.features[0].geometry.coordinates;
    return [coords[1], coords[0]];
}

//==============================================
// CALCULAR ROTA
//==============================================

async function calcularRota(origem, destino) {
    const url = `https://api.geoapify.com/v1/routing?waypoints=${origem[0]},${origem[1]}|${destino[0]},${destino[1]}&mode=drive&apiKey=${API_KEY}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();
    
    if (!dados.features) {
        throw new Error("Erro ao calcular rota.");
    }
    
    return dados;
}

//==============================================
// DESENHAR MAPA
//==============================================

function desenharMapa(rota, origem, destino, reboquePos) {
    if (linhaRota) { mapa.removeLayer(linhaRota); }
    if (marcadorOrigem) { mapa.removeLayer(marcadorOrigem); }
    if (marcadorDestino) { mapa.removeLayer(marcadorDestino); }
    if (marcadorReboque) { mapa.removeLayer(marcadorReboque); }
    
    linhaRota = L.geoJSON(rota, {
        style: { color: "#d60000", weight: 6 }
    }).addTo(mapa);
    
    marcadorOrigem = L.marker(origem, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '🟢',
            iconSize: [30, 30]
        })
    }).addTo(mapa).bindPopup('📍 Retirada');
    
    marcadorDestino = L.marker(destino, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '🔴',
            iconSize: [30, 30]
        })
    }).addTo(mapa).bindPopup('🏁 Entrega');
    
    if (reboquePos) {
        marcadorReboque = L.marker(reboquePos, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '🚚',
                iconSize: [35, 35]
            })
        }).addTo(mapa).bindPopup('📍 Posição do Reboque');
    }
    
    const bounds = linhaRota.getBounds();
    if (reboquePos) {
        bounds.extend(reboquePos);
    }
    mapa.fitBounds(bounds);
}

//==============================================
// CALCULAR PREÇO VMW
//==============================================

function calcularPrecoVMW(distanciaTotal) {
    const ate20 = parseFloat(localStorage.getItem("ate20") || 120);
    const km20a40 = parseFloat(localStorage.getItem("km20a40") || 2);
    const base40 = parseFloat(localStorage.getItem("base40") || 150);
    const kmAcima40 = parseFloat(localStorage.getItem("kmAcima40") || 2.5);
    
    if (distanciaTotal <= 20) {
        return ate20;
    }
    
    if (distanciaTotal <= 40) {
        return ate20 + ((distanciaTotal - 20) * km20a40);
    }
    
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
        let distanciaReboque = 0;
        let tempoReboque = 0;

        if (reboquePos) {
            try {
                const rotaReboque = await calcularRota(reboquePos, origem);
                if (rotaReboque && rotaReboque.features && rotaReboque.features.length > 0) {
                    distanciaReboque = rotaReboque.features[0].properties.distance / 1000;
                    tempoReboque = rotaReboque.features[0].properties.time / 60;
                }
            } catch (e) {
                console.warn("Erro ao calcular rota do reboque:", e);
            }
        }

        const distanciaTotal = distanciaCliente + distanciaReboque;
        const tempoTotal = tempoCliente + tempoReboque;
        const preco = calcularPrecoVMW(distanciaTotal);

        desenharMapa(rota, origem, destino, reboquePos);

        resultado.style.display = "block";
        km.innerHTML = distanciaTotal.toFixed(1) + " km";
        tempo.innerHTML = Math.round(tempoTotal) + " min";
        valor.innerHTML = "R$ " + preco.toFixed(2);

        const mensagem = `🚚 *NOVO ORÇAMENTO - VMW Moto-Reboques*

👤 Nome: ${nome.value}
📞 WhatsApp: ${telefone.value}
🏍 Moto: ${moto.value}
📍 Retirada: ${retirada.value}
🏁 Entrega: ${entrega.value}
📏 Distância: ${distanciaTotal.toFixed(1)} km
⏱ Tempo estimado: ${Math.round(tempoTotal)} minutos
💰 Valor: R$ ${preco.toFixed(2)}`;

        whatsapp.href = "https://wa.me/5531996488546?text=" + encodeURIComponent(mensagem);

    } catch (erro) {
        console.error("❌ Erro:", erro);
        alert("Não foi possível calcular a rota. Verifique os endereços informados.");
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
    let timeoutId = null;

    campo.addEventListener("input", async () => {
        clearTimeout(timeoutId);
        const texto = campo.value.trim();

        if (texto.length < 3) {
            lista.style.display = "none";
            return;
        }

        timeoutId = setTimeout(async () => {
            try {
                const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(texto)}&limit=5&lang=pt&apiKey=${API_KEY}`;
                const resposta = await fetch(url);
                const dados = await resposta.json();

                lista.innerHTML = "";

                if (!dados.features || dados.features.length === 0) {
                    lista.style.display = "none";
                    return;
                }

                dados.features.forEach(local => {
                    const item = document.createElement("div");
                    item.className = "item-endereco";
                    item.innerHTML = "📍 " + local.properties.formatted;
                    item.onclick = () => {
                        campo.value = local.properties.formatted;
                        lista.style.display = "none";
                    };
                    lista.appendChild(item);
                });

                lista.style.display = "block";
            } catch (e) {
                console.error("Erro no autocomplete:", e);
            }
        }, 300);
    });
}

//==============================================
// EVENTOS
//==============================================

botao.addEventListener("click", calcularOrcamento);

configurarAutocomplete("retirada", "listaRetirada");
configurarAutocomplete("entrega", "listaEntrega");

document.getElementById("formOrcamento").addEventListener("submit", (e) => {
    e.preventDefault();
    calcularOrcamento();
});

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🚀 Inicializando VMW Moto-Reboques...");
    await carregarConfiguracoesCloudflare();
    
    const reboquePos = obterLocalizacaoReboque();
    if (reboquePos) {
        L.marker(reboquePos, {
            icon: L.divIcon({
                className: 'custom-marker',
                html: '🚚',
                iconSize: [40, 40]
            })
        }).addTo(mapa).bindPopup('📍 Posição do Reboque');
        mapa.setView(reboquePos, 13);
    }

    // Menu Mobile
    const menuMobile = document.getElementById("menuMobile");
    const menu = document.getElementById("menuPrincipal");
    const overlay = document.getElementById("menuOverlay");

    if (menuMobile && menu) {
        menuMobile.addEventListener("click", () => {
            menu.classList.toggle("ativo");
            menuMobile.classList.toggle("ativo");
            if (overlay) overlay.classList.toggle("ativo");
        });
    }

    if (overlay) {
        overlay.addEventListener("click", () => {
            menu.classList.remove("ativo");
            menuMobile.classList.remove("ativo");
            overlay.classList.remove("ativo");
        });
    }

    document.querySelectorAll(".menu a").forEach(link => {
        link.addEventListener("click", () => {
            menu.classList.remove("ativo");
            menuMobile.classList.remove("ativo");
            if (overlay) overlay.classList.remove("ativo");
        });
    });

    // Header scroll
    const header = document.querySelector(".header");
    window.addEventListener("scroll", () => {
        if (window.scrollY > 80) {
            header.classList.add("header-scroll");
        } else {
            header.classList.remove("header-scroll");
        }
    });

    // Voltar ao topo
    const topo = document.getElementById("voltarTopo");
    if (topo) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 400) {
                topo.classList.add("ativo");
            } else {
                topo.classList.remove("ativo");
            }
        });
        topo.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Lightbox
    const lightbox = document.getElementById("lightbox");
    const imagem = document.getElementById("imagemLightbox");
    const fechar = document.getElementById("fecharLightbox");

    document.querySelectorAll("[data-lightbox] img").forEach(img => {
        img.addEventListener("click", () => {
            imagem.src = img.src;
            lightbox.classList.add("ativo");
        });
    });

    if (fechar) {
        fechar.addEventListener("click", () => {
            lightbox.classList.remove("ativo");
        });
    }

    if (lightbox) {
        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove("ativo");
            }
        });
    }

    // Máscaras
    telefone.addEventListener("input", (e) => {
        let v = e.target.value;
        v = v.replace(/\D/g, '');
        v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
        v = v.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = v;
    });

    nome.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/[0-9]/g, '');
    });

    // Animações
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, { threshold: .15 });

    document.querySelectorAll(".servico, .avaliacao, .foto, .passo").forEach(el => {
        el.style.opacity = 0;
        el.style.transform = "translateY(30px)";
        el.style.transition = ".6s";
        observer.observe(el);
    });

    console.log("✅ Tudo pronto!");
});