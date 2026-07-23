//==================================================
// VMW MOTO-REBOQUES
// SCRIPT.JS
//==================================================

//==============================================
// CONFIGURAÇÃO
//==============================================

const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";

//==============================================
// MAPA
//==============================================

const mapa = L.map("mapa-rota").setView(
    [-19.9167,-43.9345],
    11
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution:"© OpenStreetMap"
    }
).addTo(mapa);

let linhaRota = null;

let marcadorOrigem = null;

let marcadorDestino = null;

//==============================================
// ELEMENTOS
//==============================================

const nome =
document.getElementById("nome");

const telefone =
document.getElementById("telefone");

const moto =
document.getElementById("moto");

const retirada =
document.getElementById("retirada");

const entrega =
document.getElementById("entrega");

const botao =
document.getElementById("calcular");

const resultado =
document.getElementById("resultado");

const km =
document.getElementById("km");

const tempo =
document.getElementById("tempo");

const valor =
document.getElementById("valor");

const whatsapp =
document.getElementById("enviarWhatsapp");

//==============================================
// EVENTO
//==============================================

botao.addEventListener(
    "click",
    calcularOrcamento
);
//==================================================
// AUTOCOMPLETE
//==================================================

configurarAutocomplete(
    "retirada",
    "listaRetirada"
);

configurarAutocomplete(
    "entrega",
    "listaEntrega"
);

function configurarAutocomplete(campoId, listaId){

    const campo = document.getElementById(campoId);

    const lista = document.getElementById(listaId);

    campo.addEventListener("input", async ()=>{

        const texto = campo.value.trim();

        if(texto.length < 3){

            lista.style.display = "none";

            return;

        }

        const url =
`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(texto)}&limit=5&lang=pt&apiKey=${API_KEY}`;

        const resposta = await fetch(url);

        const dados = await resposta.json();

        lista.innerHTML = "";

        if(!dados.features){

            lista.style.display="none";

            return;

        }

        dados.features.forEach(local=>{

            const item = document.createElement("div");

            item.className = "item-endereco";

            item.innerHTML =
                "📍 " + local.properties.formatted;

            item.onclick = ()=>{

                campo.value =
                    local.properties.formatted;

                lista.style.display = "none";

            };

            lista.appendChild(item);

        });

        lista.style.display = "block";

    });

}

//==================================================
// BUSCAR COORDENADAS
//==================================================

async function buscarCoordenadas(endereco){

    const url =
`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&limit=1&lang=pt&apiKey=${API_KEY}`;

    const resposta = await fetch(url);

    const dados = await resposta.json();

    if(!dados.features || dados.features.length===0){

        throw new Error("Endereço não encontrado.");

    }

    return dados.features[0].geometry.coordinates;

}
//==================================================
// CALCULAR ROTA
//==================================================

async function calcularRota(origem,destino){

    const url =
`https://api.geoapify.com/v1/routing?waypoints=${origem[1]},${origem[0]}|${destino[1]},${destino[0]}&mode=drive&apiKey=${API_KEY}`;

    const resposta = await fetch(url);

    const dados = await resposta.json();

    if(!dados.features){

        throw new Error("Erro ao calcular rota.");

    }

    return dados;

}

//==================================================
// DESENHAR MAPA
//==================================================

function desenharMapa(rota,origem,destino){

    if(linhaRota){

        mapa.removeLayer(linhaRota);

    }

    if(marcadorOrigem){

        mapa.removeLayer(marcadorOrigem);

    }

    if(marcadorDestino){

        mapa.removeLayer(marcadorDestino);

    }

    linhaRota = L.geoJSON(rota,{
        style:{
            color:"#d60000",
            weight:6
        }
    }).addTo(mapa);

    marcadorOrigem = L.marker([
        origem[1],
        origem[0]
    ]).addTo(mapa);

    marcadorDestino = L.marker([
        destino[1],
        destino[0]
    ]).addTo(mapa);

    mapa.fitBounds(linhaRota.getBounds());

}
//==================================================
// CALCULAR ORÇAMENTO
//==================================================

async function calcularOrcamento(){

    try{

        if(
            nome.value.trim()==="" ||
            telefone.value.trim()==="" ||
            moto.value==="" ||
            retirada.value.trim()==="" ||
            entrega.value.trim()===""
        ){

            alert("Preencha todos os campos.");

            return;

        }

        botao.disabled = true;

        botao.innerHTML = "Calculando...";

        // Coordenadas

        const origem =
        await buscarCoordenadas(retirada.value);

        const destino =
        await buscarCoordenadas(entrega.value);

        // Rota

        const rota =
        await calcularRota(origem,destino);

        //==============================================
// DESLOCAMENTO DO REBOQUE
//==============================================

const reboque = obterLocalizacaoReboque();

let distanciaReboque = 0;

let tempoReboque = 0;

if(reboque){

    const rotaReboque =
    await calcularRota(reboque, origem);

    distanciaReboque =
    rotaReboque.features[0].properties.distance / 1000;

    tempoReboque =
    rotaReboque.features[0].properties.time / 60;

    console.log("Reboque:", reboque);
console.log("Origem:", origem);
console.log("Distância reboque:", distanciaReboque);
console.log("Tempo reboque:", tempoReboque);

}

        // Mapa

        desenharMapa(
            rota,
            origem,
            destino
        );

        //==============================================
// DISTÂNCIA TOTAL
//==============================================

const distanciaCliente =
rota.features[0].properties.distance / 1000;

const distancia =
distanciaCliente + distanciaReboque;
const preco =
calcularPrecoVMW(distancia);

console.log("Distância cliente:", distanciaCliente);
console.log("Distância total:", distancia);
console.log("Preço calculado:", preco);

//==============================================
// TEMPO TOTAL
//==============================================

const minutos =

(rota.features[0].properties.time / 60)

+

tempoReboque;

//==============================================
// VALOR
//==============================================


        // Resultado

        resultado.style.display = "block";

        km.innerHTML =
        distancia.toFixed(1) + " km";

        tempo.innerHTML =
        Math.round(minutos) + " min";

        valor.innerHTML =
        "R$ " + preco.toFixed(2);

        // WhatsApp

        const mensagem =
`🚚 *NOVO ORÇAMENTO - VMW Moto-Reboques*

👤 Nome:
${nome.value}

📞 WhatsApp:
${telefone.value}

🏍 Moto:
${moto.value}

📍 Retirada:
${retirada.value}

🏁 Entrega:
${entrega.value}

📏 Distância:
${distancia.toFixed(1)} km

⏱ Tempo estimado:
${Math.round(minutos)} minutos

💰 Valor:
R$ ${preco.toFixed(2)}`;

        whatsapp.href =
        "https://wa.me/5531996488546?text=" +
        encodeURIComponent(mensagem);

    }

    catch(erro){

        console.error(erro);

        alert(
            "Não foi possível calcular a rota. Verifique os endereços informados."
        );

    }

    finally{

        botao.disabled = false;

        botao.innerHTML =
        "Calcular Orçamento";

    }

}
//==================================================
// CALCULAR PREÇO VMW
//==================================================

function calcularPrecoVMW(distanciaTotal){

    const ate20 =
    parseFloat(localStorage.getItem("ate20")) || 120;

    const km20a40 =
    parseFloat(localStorage.getItem("km20a40")) || 2;

    const base40 =
    parseFloat(localStorage.getItem("base40")) || 150;

    const kmAcima40 =
    parseFloat(localStorage.getItem("kmAcima40")) || 2.5;

    if(distanciaTotal <= 20){

        return ate20;

    }

    if(distanciaTotal <= 40){

        return ate20 + ((distanciaTotal - 20) * km20a40);

    }

    return base40 + ((distanciaTotal - 40) * kmAcima40);

}
//==================================================
// LER LOCALIZAÇÃO DO REBOQUE
//==================================================

function obterLocalizacaoReboque(){

    const latitude = parseFloat(localStorage.getItem("latitude"));

    const longitude = parseFloat(localStorage.getItem("longitude"));

    if(isNaN(latitude) || isNaN(longitude)){

        return null;

    }

    return [

        longitude,

        latitude

    ];

}