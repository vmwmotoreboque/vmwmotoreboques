//==================================================
// VMW MOTO-REBOQUES
// ADMIN.JS
//==================================================

//==============================
// CONFIGURAÇÕES
//==============================

const SENHA = "vmw2026";

// COLE A MESMA CHAVE DO script.js
const API_KEY = "1c1bd45c2e5a431b8e45a47d2c57d950";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

let watchId = null;

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
// LOGIN
//==============================

btnEntrar.addEventListener("click", () => {

    if(campoSenha.value === SENHA){

        telaLogin.style.display="none";

        painel.style.display="block";

        erro.style.display="none";

        carregarConfiguracoes();

        iniciarGPSAutomatico();

    }

    else{

        erro.style.display="block";

        campoSenha.value="";

        campoSenha.focus();

    }

});

//==============================
// SAIR
//==============================

btnSair.addEventListener("click",()=>{

    if(watchId !== null){

    navigator.geolocation.clearWatch(watchId);

    watchId = null;

}

    painel.style.display="none";

    telaLogin.style.display="flex";

    campoSenha.value="";

});

//==============================
// CARREGAR CONFIGURAÇÕES
//==============================

function carregarConfiguracoes(){

    document.getElementById("ate20").value =
    localStorage.getItem("ate20") || 120;

    document.getElementById("km20a40").value =
    localStorage.getItem("km20a40") || 2;

    document.getElementById("base40").value =
    localStorage.getItem("base40") || 150;

    document.getElementById("kmAcima40").value =
    localStorage.getItem("kmAcima40") || 2.5;

    document.getElementById("cidade").innerHTML =
    localStorage.getItem("cidade") || "Não definida";

    document.getElementById("lat").innerHTML =
    localStorage.getItem("latitude") || "--";

    document.getElementById("lon").innerHTML =
    localStorage.getItem("longitude") || "--";

}

//==============================
// GPS AUTOMÁTICO
//==============================

function iniciarGPSAutomatico(){

    if(!navigator.geolocation){

        alert("Seu navegador não suporta geolocalização.");

        return;

    }

    if(watchId !== null){

        navigator.geolocation.clearWatch(watchId);

    }

    watchId = navigator.geolocation.watchPosition(

        async(posicao)=>{

            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            document.getElementById("lat").innerHTML =
            latitude.toFixed(6);

            document.getElementById("lon").innerHTML =
            longitude.toFixed(6);

            localStorage.setItem(
                "latitude",
                latitude
            );

            localStorage.setItem(
                "longitude",
                longitude
            );

            await buscarCidade(
                latitude,
                longitude
            );

        },

        (erro)=>{

            console.log("GPS:", erro);

        },

        {

            enableHighAccuracy:true,
            timeout:10000,
            maximumAge:5000

        }

    );

}
//==============================
// ATUALIZAR LOCALIZAÇÃO
//==============================

btnAtualizar.addEventListener("click",()=>{

    if(!navigator.geolocation){

        alert("Seu navegador não suporta geolocalização.");

        return;

    }

    btnAtualizar.innerHTML="Obtendo localização...";

    navigator.geolocation.getCurrentPosition(

        async(posicao)=>{

            const latitude=posicao.coords.latitude;
            const longitude=posicao.coords.longitude;

            document.getElementById("lat").innerHTML=
            latitude.toFixed(6);

            document.getElementById("lon").innerHTML=
            longitude.toFixed(6);

            localStorage.setItem(
                "latitude",
                latitude
            );

            localStorage.setItem(
                "longitude",
                longitude
            );

            await buscarCidade(
                latitude,
                longitude
            );

            btnAtualizar.innerHTML=
            "Atualizar localização";

        },

        ()=>{

            btnAtualizar.innerHTML=
            "Atualizar localização";

            alert("Não foi possível obter sua localização.");

        },

        {

            enableHighAccuracy:true,
            timeout:10000,
            maximumAge:0

        }

    );

});

//==============================
// BUSCAR CIDADE
//==============================

async function buscarCidade(lat,lon){

    try{

        const resposta=await fetch(

`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${API_KEY}`

        );

        const dados=await resposta.json();

        if(!dados.features.length){

            return;

        }

        const info=dados.features[0].properties;

        const cidade=

            info.city ||

            info.town ||

            info.village ||

            info.county ||

            "Não encontrada";

        document.getElementById("cidade").innerHTML=
        cidade;

        localStorage.setItem(
            "cidade",
            cidade
        );

    }

    catch(erro){

        console.log(erro);

    }

}
//==============================
// SALVAR CONFIGURAÇÕES
//==============================

btnSalvar.addEventListener("click", async () => {

    const configuracao = {

        ate20: document.getElementById("ate20").value,

        km20a40: document.getElementById("km20a40").value,

        base40: document.getElementById("base40").value,

        kmAcima40: document.getElementById("kmAcima40").value,

        cidade: localStorage.getItem("cidade"),

        latitude: localStorage.getItem("latitude"),

        longitude: localStorage.getItem("longitude")

    };

    try{

        const resposta = await fetch(API_URL,{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(configuracao)

        });

        if(!resposta.ok){

            throw new Error();

        }

        alert("Configurações salvas na Cloudflare!");

    }

    catch(e){

        alert("Erro ao salvar na Cloudflare.");

    }

});

//==============================
// ENTER FAZ LOGIN
//==============================

campoSenha.addEventListener("keypress",(e)=>{

    if(e.key==="Enter"){

        btnEntrar.click();

    }

});

