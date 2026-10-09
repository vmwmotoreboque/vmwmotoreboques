//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (VERSÃO 5.0.0)
// SINCRONIZAÇÃO COM API
//==================================================

const SENHA = "vmw2026";
const API_URL = "https://vmw-config-api.vmwreboques.workers.dev";

let carregando = false;

//==============================================
// ELEMENTOS
//==============================================

const telaLogin = document.querySelector(".login");
const painel = document.getElementById("painel");
const campoSenha = document.getElementById("senha");
const erro = document.getElementById("erro");
const btnEntrar = document.getElementById("entrar");
const btnSair = document.getElementById("sair");
const btnAtualizar = document.getElementById("atualizarLocalizacao");

//==============================================
// FUNÇÃO: CARREGAR DADOS DA API
//==============================================

async function carregarConfiguracoes() {
    if (carregando) return;
    carregando = true;

    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Cloudflare offline");

        const cfg = await res.json();
        console.log("📊 Dados carregados da API:", cfg);

        // Localização
        const cidadeEl = document.getElementById("cidade");
        const latEl = document.getElementById("lat");
        const lonEl = document.getElementById("lon");
        
        if (cidadeEl) cidadeEl.innerHTML = cfg.cidade || "--";
        if (latEl) latEl.innerHTML = cfg.latitude != null ? Number(cfg.latitude).toFixed(6) : "--";
        if (lonEl) lonEl.innerHTML = cfg.longitude != null ? Number(cfg.longitude).toFixed(6) : "--";

        // Status GPS
        const statusGPSEl = document.getElementById("statusGPS");
        if (statusGPSEl) statusGPSEl.innerHTML = cfg.status || "offline";

        // Status Cloudflare
        const statusCloudEl = document.getElementById("statusCloud");
        if (statusCloudEl) {
            statusCloudEl.innerHTML = "✅ Conectado";
            statusCloudEl.style.color = "#1ecb5a";
        }

        // Preços por horário
        const camposPrecos = [
            'preco_00_05', 'preco_05_0830', 'preco_0831_14', 'preco_14_18', 
            'preco_18_20', 'preco_20_22', 'preco_22_2359',
            'gasolina', 'consumo', 'depreciacao', 'manutencao'
        ];
        
        camposPrecos.forEach(id => {
            const input = document.getElementById(id);
            if (input && cfg[id] !== undefined) {
                input.value = cfg[id];
                localStorage.setItem(id, cfg[id]); // Sincroniza com LocalStorage
            }
        });

        // Oficinas
        if (cfg.oficinas) {
            localStorage.setItem('oficinas_parceiras', JSON.stringify(cfg.oficinas));
            carregarOficinas();
        }

    } catch (e) {
        console.error("Erro ao carregar da API:", e);
        const statusCloudEl = document.getElementById("statusCloud");
        if (statusCloudEl) {
            statusCloudEl.innerHTML = "❌ Offline (usando cache local)";
            statusCloudEl.style.color = "#d60000";
        }
        // Fallback: carrega do LocalStorage
        carregarConfiguracoesLocais();
        carregarOficinas();
    } finally {
        carregando = false;
    }
}

//==============================================
// FUNÇÃO: CARREGAR DO LOCALSTORAGE (FALLBACK)
//==============================================

function carregarConfiguracoesLocais() {
    const campos = [
        'preco_00_05', 'preco_05_0830', 'preco_0831_14', 'preco_14_18', 
        'preco_18_20', 'preco_20_22', 'preco_22_2359',
        'gasolina', 'consumo', 'depreciacao', 'manutencao'
    ];
    
    campos.forEach(id => {
        const valor = localStorage.getItem(id);
        const input = document.getElementById(id);
        if (input && valor) input.value = valor;
    });
}

//==============================================
// FUNÇÃO: SALVAR CONFIGURAÇÕES NA API
//==============================================

async function salvarConfiguracoesNaAPI() {
    try {
        // 1. Pega os dados atuais da API
        const resAtual = await fetch(API_URL);
        let configAtual = {};
        if (resAtual.ok) {
            configAtual = await resAtual.json();
        }

        // 2. Monta o novo objeto de configuração
        const novaConfig = {
            ...configAtual,
            preco_00_05: document.getElementById('preco_00_05').value,
            preco_05_0830: document.getElementById('preco_05_0830').value,
            preco_0831_14: document.getElementById('preco_0831_14').value,
            preco_14_18: document.getElementById('preco_14_18').value,
            preco_18_20: document.getElementById('preco_18_20').value,
            preco_20_22: document.getElementById('preco_20_22').value,
            preco_22_2359: document.getElementById('preco_22_2359').value,
            gasolina: document.getElementById('gasolina').value,
            consumo: document.getElementById('consumo').value,
            depreciacao: document.getElementById('depreciacao').value,
            manutencao: document.getElementById('manutencao').value,
            oficinas: JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]')
        };

        // 3. Envia para a API
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaConfig)
        });

        if (!res.ok) throw new Error("Falha ao salvar na API");

        // 4. Salva no LocalStorage também (backup)
        Object.keys(novaConfig).forEach(key => {
            if (typeof novaConfig[key] === 'string' || typeof novaConfig[key] === 'number') {
                localStorage.setItem(key, novaConfig[key]);
            }
        });
        if (novaConfig.oficinas) {
            localStorage.setItem('oficinas_parceiras', JSON.stringify(novaConfig.oficinas));
        }

        console.log("✅ Configurações salvas na API");
        return true;

    } catch (e) {
        console.error("❌ Erro ao salvar na API:", e);
        // Fallback: salva só no LocalStorage
        const campos = ['preco_00_05', 'preco_05_0830', 'preco_0831_14', 'preco_14_18', 'preco_18_20', 'preco_20_22', 'preco_22_2359', 'gasolina', 'consumo', 'depreciacao', 'manutencao'];
        campos.forEach(id => {
            const valor = document.getElementById(id).value;
            if (valor) localStorage.setItem(id, valor);
        });
        return false;
    }
}

//==============================================
// FUNÇÕES: SALVAR SEÇÕES
//==============================================

async function salvarPrecosHorarios() {
    const sucesso = await salvarConfiguracoesNaAPI();
    if (sucesso) {
        alert("✅ Preços por horário salvos na nuvem!");
    } else {
        alert("⚠️ Salvo apenas no celular (sem internet).");
    }
}

async function salvarCustosOperacionais() {
    const sucesso = await salvarConfiguracoesNaAPI();
    if (sucesso) {
        alert("✅ Custos operacionais salvos na nuvem!");
    } else {
        alert("⚠️ Salvo apenas no celular (sem internet).");
    }
}

//==============================================
// FUNÇÕES: OFICINAS
//==============================================

function carregarOficinas() {
    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    const tbody = document.getElementById('lista-oficinas');
    
    if (!tbody) return;

    if (oficinas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">Nenhuma oficina cadastrada.</td></tr>';
        return;
    }

    tbody.innerHTML = oficinas.map((oficina, index) => `
        <tr>
            <td>${oficina.nome}</td>
            <td>${oficina.endereco}</td>
            <td>${oficina.telefone}</td>
            <td>${oficina.especialidade}</td>
            <td>
                <button onclick="excluirOficina(${index})" style="color: red; background: none; border: none; cursor: pointer;">🗑️ Excluir</button>
            </td>
        </tr>
    `).join('');
}

async function cadastrarOficina() {
    const nome = document.getElementById('oficina_nome').value;
    const endereco = document.getElementById('oficina_endereco').value;
    const telefone = document.getElementById('oficina_telefone').value;
    const especialidade = document.getElementById('oficina_especialidade').value;

    if (!nome || !endereco || !telefone) {
        alert("Preencha pelo menos Nome, Endereço e Telefone.");
        return;
    }

    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    oficinas.push({ nome, endereco, telefone, especialidade });
    localStorage.setItem('oficinas_parceiras', JSON.stringify(oficinas));

    document.getElementById('oficina_nome').value = '';
    document.getElementById('oficina_endereco').value = '';
    document.getElementById('oficina_telefone').value = '';
    document.getElementById('oficina_especialidade').value = '';

    carregarOficinas();
    
    // Salva na API
    const sucesso = await salvarConfiguracoesNaAPI();
    if (sucesso) {
        alert("✅ Oficina cadastrada e sincronizada!");
    } else {
        alert("⚠️ Oficina salva apenas no celular (sem internet).");
    }
}

async function excluirOficina(index) {
    if (!confirm("Tem certeza que deseja excluir esta oficina?")) return;
    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    oficinas.splice(index, 1);
    localStorage.setItem('oficinas_parceiras', JSON.stringify(oficinas));
    carregarOficinas();
    
    await salvarConfiguracoesNaAPI();
}

//==============================================
// FUNÇÃO: VERIFICAR STATUS
//==============================================

async function verificarStatus() {
    try {
        const res = await fetch(API_URL);
        const statusCloudEl = document.getElementById("statusCloud");
        if (res.ok) {
            if (statusCloudEl) {
                statusCloudEl.innerHTML = "✅ Online";
                statusCloudEl.style.color = "#1ecb5a";
            }
        } else {
            if (statusCloudEl) {
                statusCloudEl.innerHTML = "⚠️ Problema";
                statusCloudEl.style.color = "#ff6b00";
            }
        }
    } catch (e) {
        const statusCloudEl = document.getElementById("statusCloud");
        if (statusCloudEl) {
            statusCloudEl.innerHTML = "❌ Offline";
            statusCloudEl.style.color = "#d60000";
        }
    }
}

//==============================================
// SESSÃO
//==============================================

function salvarSessao() {
    localStorage.setItem("sessaoAtiva", "true");
    localStorage.setItem("ultimaSessao", new Date().toISOString());
}

function restaurarSessao() {
    const sessaoAtiva = localStorage.getItem("sessaoAtiva");
    if (sessaoAtiva === "true") {
        telaLogin.style.display = "none";
        painel.style.display = "block";
        (async () => {
            await carregarConfiguracoes();
            await verificarStatus();
            carregarOficinas();
        })();
        return true;
    }
    return false;
}

//==============================================
// EVENTOS
//==============================================

btnEntrar.addEventListener("click", async () => {
    if (campoSenha.value === SENHA) {
        telaLogin.style.display = "none";
        painel.style.display = "block";
        erro.style.display = "none";
        
        await carregarConfiguracoes();
        await verificarStatus();
        carregarOficinas();
        
        salvarSessao();
        console.log("🔓 Login efetuado");
    } else {
        erro.style.display = "block";
        campoSenha.value = "";
        campoSenha.focus();
    }
});

campoSenha.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btnEntrar.click();
});

btnSair.addEventListener("click", () => {
    localStorage.setItem("sessaoAtiva", "false");
    painel.style.display = "none";
    telaLogin.style.display = "flex";
    campoSenha.value = "";
    erro.style.display = "none";
});

btnAtualizar.addEventListener("click", async () => {
    btnAtualizar.disabled = true;
    btnAtualizar.innerHTML = "⏳ Atualizando...";
    await carregarConfiguracoes();
    await verificarStatus();
    carregarOficinas();
    btnAtualizar.innerHTML = "✅ Atualizado!";
    setTimeout(() => {
        btnAtualizar.disabled = false;
        btnAtualizar.innerHTML = "🔄 Atualizar dados";
    }, 2000);
});

//==============================================
// INICIALIZAÇÃO
//==============================================

document.addEventListener("DOMContentLoaded", () => {
    const logado = restaurarSessao();
    if (!logado) {
        telaLogin.style.display = "flex";
        painel.style.display = "none";
    }
    console.log("✅ ADMIN.JS CARREGADO (VERSÃO 5.0.0)");
});

setInterval(carregarConfiguracoes, 30000);
setInterval(verificarStatus, 60000);