//==================================================
// VMW MOTO-REBOQUES - ADMIN.JS (VERSÃO 16.1.0)
// CORRIGIDO: REMOVIDO CAMPO chave_pix (NÃO EXISTE MAIS)
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
        console.log("📊 Dados recebidos da API:", cfg);

        const cidadeEl = document.getElementById("cidade");
        const latEl = document.getElementById("lat");
        const lonEl = document.getElementById("lon");
        
        if (cidadeEl) cidadeEl.innerHTML = cfg.cidade || "--";
        if (latEl) latEl.innerHTML = cfg.latitude != null ? Number(cfg.latitude).toFixed(6) : "--";
        if (lonEl) lonEl.innerHTML = cfg.longitude != null ? Number(cfg.longitude).toFixed(6) : "--";

        const statusGPSEl = document.getElementById("statusGPS");
        if (statusGPSEl) statusGPSEl.innerHTML = cfg.status || "offline";

        const statusCloudEl = document.getElementById("statusCloud");
        if (statusCloudEl) {
            statusCloudEl.innerHTML = "✅ Conectado";
            statusCloudEl.style.color = "#1ecb5a";
        }

        const camposPrecos = [
            'preco_00_05', 'preco_05_0830', 'preco_0831_14', 'preco_14_18', 
            'preco_18_20', 'preco_20_22', 'preco_22_2359',
            'gasolina', 'consumo', 'depreciacao', 'manutencao'
        ];
        
        camposPrecos.forEach(id => {
            const input = document.getElementById(id);
            if (input && cfg[id] !== undefined) {
                input.value = cfg[id];
                localStorage.setItem(id, cfg[id]);
            }
        });

        if (cfg.oficinas) {
            localStorage.setItem('oficinas_parceiras', JSON.stringify(cfg.oficinas));
            carregarOficinas();
        }

        if (cfg.orcamentos) {
            carregarOrcamentos(cfg.orcamentos);
        }

        console.log("✅ Dados carregados:", new Date().toLocaleTimeString());

    } catch (e) {
        console.error("Erro ao carregar da API:", e);
        const statusCloudEl = document.getElementById("statusCloud");
        if (statusCloudEl) {
            statusCloudEl.innerHTML = "❌ Offline";
            statusCloudEl.style.color = "#d60000";
        }
        carregarConfiguracoesLocais();
        carregarOficinas();
    } finally {
        carregando = false;
    }
}

//==============================================
// FUNÇÃO: CARREGAR ORÇAMENTOS
//==============================================

function carregarOrcamentos(orcamentos) {
    const tbody = document.getElementById('lista-orcamentos');
    if (!tbody) return;

    if (!orcamentos || orcamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #999;">Nenhum orçamento recebido ainda.</td></tr>';
        document.getElementById('total-valor').innerHTML = 'R$ 0,00';
        document.getElementById('total-custo').innerHTML = 'R$ 0,00';
        document.getElementById('total-lucro').innerHTML = 'R$ 0,00';
        return;
    }

    let totalValor = 0;
    let totalCusto = 0;
    let totalLucro = 0;

    tbody.innerHTML = orcamentos.map((orc, index) => {
        const valor = parseFloat(orc.valor) || 0;
        const custo = parseFloat(orc.custo) || 0;
        const lucro = parseFloat(orc.lucro) || 0;
        
        totalValor += valor;
        totalCusto += custo;
        totalLucro += lucro;

        return `
            <tr>
                <td>${new Date(orc.data).toLocaleDateString('pt-BR')}</td>
                <td>${orc.nome || '--'}</td>
                <td>${orc.telefone || '--'}</td>
                <td>${orc.retirada || '--'}</td>
                <td>${orc.entrega || '--'}</td>
                <td>${orc.moto || '--'}</td>
                <td>${orc.kmTotal || '--'} km</td>
                <td>R$ ${valor.toFixed(2)}</td>
                <td>R$ ${custo.toFixed(2)}</td>
                <td>R$ ${lucro.toFixed(2)}</td>
                <td>
                    <button onclick="excluirOrcamento(${index})" class="btn-excluir">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('total-valor').innerHTML = 'R$ ' + totalValor.toFixed(2);
    document.getElementById('total-custo').innerHTML = 'R$ ' + totalCusto.toFixed(2);
    document.getElementById('total-lucro').innerHTML = 'R$ ' + totalLucro.toFixed(2);
}

//==============================================
// FUNÇÃO: EXCLUIR ORÇAMENTO
//==============================================

async function excluirOrcamento(index) {
    if (!confirm("Tem certeza que deseja excluir este orçamento?")) return;
    
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        let orcamentos = data.orcamentos || [];
        
        if (!orcamentos[index]) {
            console.error("Orçamento não encontrado no índice:", index);
            return;
        }
        
        orcamentos.splice(index, 1);
        
        await fetch(API_URL + "/orcamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orcamentos: orcamentos })
        });
        
        carregarOrcamentos(orcamentos);
        alert("✅ Orçamento excluído!");
    } catch (e) {
        console.error("Erro ao excluir:", e);
        alert("❌ Erro ao excluir.");
    }
}

//==============================================
// FUNÇÃO: EXCLUIR TODOS OS ORÇAMENTOS
//==============================================

async function excluirTodosOrcamentos() {
    if (!confirm("Tem certeza que deseja excluir TODOS os orçamentos? Esta ação não pode ser desfeita.")) return;
    
    try {
        await fetch(API_URL + "/orcamentos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orcamentos: [] })
        });
        
        carregarOrcamentos([]);
        alert("✅ Todos os orçamentos foram excluídos!");
    } catch (e) {
        console.error("Erro ao excluir todos:", e);
        alert("❌ Erro ao excluir.");
    }
}

//==============================================
// FUNÇÃO: SALVAR NA API (CORRIGIDA - SEM chave_pix)
//==============================================

async function salvarCloudflare() {
    try {
        const config = {
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

        console.log("📤 Enviando para a API:", config);

        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config)
        });

        if (!res.ok) {
            const erro = await res.text();
            throw new Error("API retornou: " + res.status + " - " + erro);
        }

        const resposta = await res.json();
        console.log("✅ Resposta da API:", resposta);

        Object.keys(config).forEach(key => {
            if (typeof config[key] === 'string' || typeof config[key] === 'number') {
                localStorage.setItem(key, config[key]);
            }
        });

        return true;

    } catch (e) {
        console.error("❌ Erro ao salvar na API:", e);
        return false;
    }
}

//==============================================
// FUNÇÕES: SALVAR SEÇÕES
//==============================================

async function salvarPrecosHorarios() {
    const campos = ['preco_00_05', 'preco_05_0830', 'preco_0831_14', 'preco_14_18', 'preco_18_20', 'preco_20_22', 'preco_22_2359'];
    campos.forEach(id => {
        const valor = document.getElementById(id).value;
        if (valor) localStorage.setItem(id, valor);
    });
    const sucesso = await salvarCloudflare();
    alert(sucesso ? "✅ Preços salvos na nuvem!" : "⚠️ Salvo apenas no celular (sem internet).");
}

async function salvarCustosOperacionais() {
    const campos = ['gasolina', 'consumo', 'depreciacao', 'manutencao'];
    campos.forEach(id => {
        const valor = document.getElementById(id).value;
        if (valor) localStorage.setItem(id, valor);
    });
    const sucesso = await salvarCloudflare();
    alert(sucesso ? "✅ Custos salvos na nuvem!" : "⚠️ Salvo apenas no celular (sem internet).");
}

//==============================================
// FUNÇÕES: OFICINAS
//==============================================

function carregarOficinas() {
    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    const tbody = document.getElementById('lista-oficinas');
    if (!tbody) return;

    if (oficinas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Nenhuma oficina cadastrada.</td></tr>';
        return;
    }

    tbody.innerHTML = oficinas.map((oficina, index) => `
        <tr>
            <td>${oficina.nome}</td>
            <td>${oficina.endereco}</td>
            <td>${oficina.telefone}</td>
            <td>${oficina.especialidade}</td>
            <td>${oficina.pix || '--'}</td>
            <td><button onclick="excluirOficina(${index})" style="color: red; background: none; border: none; cursor: pointer;">🗑️ Excluir</button></td>
        </tr>
    `).join('');
}

async function cadastrarOficina() {
    const nome = document.getElementById('oficina_nome').value;
    const endereco = document.getElementById('oficina_endereco').value;
    const telefone = document.getElementById('oficina_telefone').value;
    const especialidade = document.getElementById('oficina_especialidade').value;
    const pix = document.getElementById('oficina_pix').value;

    if (!nome || !endereco || !telefone) {
        alert("Preencha pelo menos Nome, Endereço e Telefone.");
        return;
    }

    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    oficinas.push({ nome, endereco, telefone, especialidade, pix });
    localStorage.setItem('oficinas_parceiras', JSON.stringify(oficinas));

    document.getElementById('oficina_nome').value = '';
    document.getElementById('oficina_endereco').value = '';
    document.getElementById('oficina_telefone').value = '';
    document.getElementById('oficina_especialidade').value = '';
    document.getElementById('oficina_pix').value = '';

    carregarOficinas();
    
    // Salvar na API
    const sucesso = await salvarCloudflare();
    alert(sucesso ? "✅ Oficina cadastrada e sincronizada!" : "⚠️ Oficina salva apenas no celular.");
}

async function excluirOficina(index) {
    if (!confirm("Tem certeza que deseja excluir esta oficina?")) return;
    const oficinas = JSON.parse(localStorage.getItem('oficinas_parceiras') || '[]');
    oficinas.splice(index, 1);
    localStorage.setItem('oficinas_parceiras', JSON.stringify(oficinas));
    carregarOficinas();
    await salvarCloudflare();
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
    console.log("🔒 Sessão encerrada");
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
    console.log("✅ ADMIN.JS CARREGADO (VERSÃO 16.1.0)");
});

setInterval(carregarConfiguracoes, 30000);
setInterval(verificarStatus, 60000);