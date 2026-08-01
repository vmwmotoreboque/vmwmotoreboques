//==================================================
// VMW MOTO-REBOQUES - APP INIT 
//==================================================

console.log('🚀 Inicializando VMW App...');

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const API_URL = 'https://vmw-config-api.vmwreboques.workers.dev';

//==============================================
// FUNÇÃO: ENVIAR POSIÇÃO
//==============================================

async function enviarPosicao(position) {
    try {
        const { latitude, longitude } = position.coords;
        
        const config = {
            latitude: latitude,
            longitude: longitude,
            ate20: localStorage.getItem('ate20') || 120,
            km20a40: localStorage.getItem('km20a40') || 2,
            base40: localStorage.getItem('base40') || 150,
            kmAcima40: localStorage.getItem('kmAcima40') || 2.5,
            cidade: localStorage.getItem('cidade') || 'Belo Horizonte',
            ultimaAtualizacao: new Date().toISOString()
        };

        console.log('📤 Enviando:', latitude, longitude);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            localStorage.setItem('latitude', latitude);
            localStorage.setItem('longitude', longitude);
            localStorage.setItem('ultimaAtualizacaoGPS', Date.now().toString());
            console.log('✅ Enviado!');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
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

        // Watch Position
        await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
            async (position) => {
                if (position && position.coords) {
                    await enviarPosicao(position);
                }
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