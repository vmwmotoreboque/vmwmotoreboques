//==================================================
// VMW MOTO-REBOQUES - APP INIT 
//==================================================

console.log('🚀 Inicializando VMW App...');

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const API_URL = 'https://vmw-config-api.vmwreboques.workers.dev';

//==============================================
// FUNÇÃO: ENVIAR POSIÇÃO (VERSÃO ATUALIZADA)
//==============================================

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

            ate20: Number(localStorage.getItem('ate20')) || 120,
            km20a40: Number(localStorage.getItem('km20a40')) || 2,
            base40: Number(localStorage.getItem('base40')) || 150,
            kmAcima40: Number(localStorage.getItem('kmAcima40')) || 2.5,
            cidade: localStorage.getItem('cidade') || 'Belo Horizonte'
        };

        console.log("📤 GPS:", config);

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(config)
        });

        if (response.ok) {

            localStorage.setItem("latitude", config.latitude);
            localStorage.setItem("longitude", config.longitude);
            localStorage.setItem("ultimaAtualizacaoGPS", Date.now());

            console.log("✅ GPS enviado");
        }

    } catch (e) {
        console.error(e);
    }
}

//==============================================
// INICIAR RASTREAMENTO
//==============================================

async function iniciarRastreamento() {
    console.log('📱 Iniciando rastreamento...');

    try {
        const perms = await Geolocation.checkPermissions();
        if (perms.location !== 'granted') {
            const result = await Geolocation.requestPermissions();
            if (result.location !== 'granted') {
                console.warn('⚠️ Permissão negada!');
                return;
            }
        }

        // Watch Position com filtro de duplicidade
        let ultimaLatitude = null;
        let ultimaLongitude = null;

        await Geolocation.watchPosition(
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            },
            async (position) => {

                if (!position || !position.coords) return;

                const { latitude, longitude } = position.coords;

                if (
                    ultimaLatitude === latitude &&
                    ultimaLongitude === longitude
                ) {
                    return;
                }

                ultimaLatitude = latitude;
                ultimaLongitude = longitude;

                await enviarPosicao(position);
            }
        );

        console.log('✅ Rastreamento iniciado!');
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 App VMW iniciando...');
    if (Capacitor.isNativePlatform()) {
        console.log('📱 Modo nativo');
        await iniciarRastreamento();
    } else {
        console.log('🌐 Modo navegador');
    }
    console.log('✅ App VMW pronto!');
});

console.log('✅ index.js carregado!');