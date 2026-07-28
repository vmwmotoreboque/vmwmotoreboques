// Cloudflare Worker para VMW Moto-Reboques
const CACHE_KEY = 'vmw_config';

async function handleRequest(request) {
    const url = new URL(request.url);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    if (request.method === 'GET') {
        try {
            const config = await VMV_CONFIG.get(CACHE_KEY, 'json');
            if (config) {
                return new Response(JSON.stringify(config), { headers });
            }
            const defaultConfig = {
                ate20: 120,
                km20a40: 2,
                base40: 150,
                kmAcima40: 2.5,
                cidade: 'Belo Horizonte',
                latitude: -19.9167,
                longitude: -43.9345,
                ultimaAtualizacao: new Date().toISOString()
            };
            await VMV_CONFIG.put(CACHE_KEY, JSON.stringify(defaultConfig));
            return new Response(JSON.stringify(defaultConfig), { headers });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Erro ao ler configuração' }), {
                status: 500,
                headers
            });
        }
    }

    if (request.method === 'POST') {
        try {
            const config = await request.json();
            const required = ['ate20', 'km20a40', 'base40', 'kmAcima40', 'cidade', 'latitude', 'longitude'];
            for (const field of required) {
                if (config[field] === undefined || config[field] === null) {
                    return new Response(JSON.stringify({ error: `Campo ${field} ausente` }), {
                        status: 400,
                        headers
                    });
                }
            }
            config.ultimaAtualizacao = new Date().toISOString();
            await VMV_CONFIG.put(CACHE_KEY, JSON.stringify(config));
            return new Response(JSON.stringify({ success: true, config }), { headers });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Erro ao salvar configuração' }), {
                status: 500,
                headers
            });
        }
    }

    return new Response('Método não permitido', { status: 405, headers });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});