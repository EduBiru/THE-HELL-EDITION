/* ======================================================================== */
/* */
/* FINANÇAS DO BIRU - CONSOLIDADO (JS)                  */
/* */
/* BUILD COMPLETO (Parte 1 + Parte 2)                   */
/* (Corrigido: Parser, Datas, Valores e 'DOMContentLoaded') */
/* */
/* ======================================================================== */

/* ======================================================================== */
/* PARTE 1: DADOS E LÓGICA                                                  */
/* ======================================================================== */

/* --- Variáveis Globais de Estado --- */
let RAW_DATA = []; // Dados brutos do CSV
let PROCESSED_DATA = []; // Dados processados e agrupados
let FILTERED_DATA = []; // Dados visíveis após filtros
let NAME_ALIASES = {}; // Objeto de aliases
let ALL_YEARS = []; // Array de anos para os filtros
let CURRENT_YEARS = []; // Anos selecionados
let CURRENT_SORT = { key: 'name', order: 'asc' }; // Ordenação
let ACCORDION_PAGE = 1; // Paginação do acordeão
const ACCORDION_PAGE_SIZE = 20;

// Estado dos filtros (carregado do localStorage)
let FILTERS = {
  search: '',
  groupUnknown: false,
  showIgnored: true,
};

// Instâncias dos Gráficos (serão inicializadas)
let chartDaily = null;
let chartMonthly = null;
let barChart = null;
let summaryChart = null;
let calendarHeatmap = null;

// Nomes-chave para ignorar nos totais (se 'showIgnored' for falso)
// Fundido do Dashboard.html e EduBiru.HTML
const IGNORE_NAMES_REGEX = /^(Crédito Salário|Pix Recebido|Aplicação|Resgate|Transferência Interna|Pagamento Fatura|Carlos Eduardo Calçada|Maria Inez dos Santos Calçada|O Próprio Favorecido)/i;

/* ======================================================================== */
/* FUNÇÕES DE PARSE (CORRIGIDAS E NO LUGAR CERTO)     */
/* ======================================================================== */

/**
 * Converte data DD/MM/YYYY ou DD/MM/YY para um objeto Date.
 * (Versão "Parruda" que aceita 2 ou 4 dígitos no ano)
 * @param {string} dateStr - A string da data (ex: "17/02/23" ou "17/02/2023")
 * @returns {Date|null} - O objeto Date ou null se inválido.
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // 1. Limpa lixo (aspas, espaços)
  const cleanStr = dateStr.replace(/"/g, '').trim();
  
  // 2. Valida o tamanho (8 ou 10 chars)
  if (cleanStr.length !== 8 && cleanStr.length !== 10) return null;

  const parts = cleanStr.split('/');
  if (parts.length !== 3) return null;

  // 3. Converte para número (trata "08" como 8)
  let day = Number(parts[0]);
  let month = Number(parts[1]);
  let year = Number(parts[2]);
  
  // 4. A MÁGICA: Converte ano de 2 dígitos (ex: 23) para 4 (ex: 2023)
  if (year < 100) {
    year += 2000;
  }

  // 5. Mês é 0-indexado
  const date = new Date(year, month - 1, day);
  
  // 6. Validação final (vê se não é 31/02, etc.)
  if (date.getFullYear() == year && date.getMonth() == (month - 1) && date.getDate() == day) {
    return date;
  }
  return null;
}

/**
 * Converte valor BRL (ex: "1.234,56" ou ""-20,00"") para número.
 * (Versão "Parruda" que aceita aspas e vírgulas)
 * @param {string} valueStr - A string do valor.
 * @returns {number} - O valor numérico.
 */
function parseValue(valueStr) {
  if (!valueStr) return 0;
  
  // 1. Remove R$, aspas, e espaços
  let cleaned = valueStr.toString()
    .replace(/"/g, '') // TIRA AS ASPAS
    .replace("R$", "")
    .trim();
  
  // 2. Trata parênteses (ex: (1.234,56))
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.substring(1, cleaned.length - 1);
  }

  // 3. Converte BRL (1.234,56) para US (1234.56)
  // Remove o ponto de milhar (SE ele existir antes de uma vírgula)
  if (cleaned.includes(',') && cleaned.includes('.')) {
     cleaned = cleaned.replace(/\./g, ''); // Remove todos os pontos (milhar)
  }
  // Troca a vírgula (decimal) por ponto
  cleaned = cleaned.replace(',', '.'); 
  
  return parseFloat(cleaned) || 0;
}


/* ======================================================================== */
/* LISTA MESTRA DE ALIASES (PRÉ-CARREGADA)            */
/* ======================================================================== */

// Esta é a fusão do seu 'financas_biru_backup_2025-11-05.json'
// com todas as regras encontradas nos outros arquivos HTML.
const DEFAULT_ALIASES = {
  "maria inez": "Maria Inez dos Santos Calçada",
  "maria inez dos santos": "Maria Inez dos Santos Calçada",
  "maria inez dos santos calcada": "Maria Inez dos Santos Calçada",
  "inez dos santos": "Maria Inez dos Santos Calçada",
  "inez dos santos calca": "Maria Inez dos Santos Calçada",
  "carlos eduardo": "Carlos Eduardo Calçada",
  "carlos eduardo calcada": "Carlos Eduardo Calçada",
  "carlos eduardo calcad": "Carlos Eduardo Calçada",
  "ana paula calcada": "Ana Paula Calçada Pereira",
  "ana paula calcada pereira": "Ana Paula Calçada Pereira",
  "ana paula calcada pereir": "Ana Paula Calçada Pereira",
  "angelo calcada": "Angelo Calçada Pereira",
  "angelo calcada pereira": "Angelo Calçada Pereira",
  "fabio ricardo trindad": "Fábio Ricardo Trindade",
  "lucas jesus da silva arruiz": "Lucas Jesus da Silva",
  "lucas jesus da silva": "Lucas Jesus da Silva",
  "lucas jesus d": "Lucas Jesus da Silva",
  "lucas jesus da silva e afins": "Lucas Jesus da Silva",
  "alexsander tarouco l": "Alexsander Tarouco",
  "luiza silveira perei": "Luiza Silveira Pereira",
  "cristina dos santos b": "Cristina dos Santos",
  "ewerton": "Ewerton Adilson Valente Machado",
  "ewerton adilson valente": "Ewerton Adilson Valente Machado",
  "ewerton adilson v m": "Ewerton Adilson Valente Machado",
  "ewerton adilson": "Ewerton Adilson Valente Machado",
  "juliana reis rodrigues": "Juliana Reis Rodrigues",
  "juliana reis rodrigu": "Juliana Reis Rodrigues",
  "juliana reis rodrigues me": "Juliana Reis Rodrigues",
  "juliana reis rodr": "Juliana Reis Rodrigues",
  "uber": "Uber",
  "uber do brasil tecnol": "Uber",
  "uber uber trip": "Uber",
  "uber trip helpuber": "Uber",
  "uberbr uber trip hel": "Uber",
  "uber do brasil tecno": "Uber",
  "uber do brasil tecnologia": "Uber",
  "deisi maria troina al": "Deisi Maria",
  "t elet disp carlos e c costa": "Carlos Eduardo Calçada",
  "t elet disp carlos costa": "Carlos Eduardo Calçada",
  "pag carloseduardo": "Carlos Eduardo Calçada",
  "qrcode est luiz carlos rodrigues": "Luiz Carlos Rodrigues",
  "contas dotel": "Crédito Salário Hotel Swan",
  "vivian de fatima sala": "Vivian de Fátima Salazar",
  "vivian de fatima salazar s": "Vivian de Fátima Salazar",
  "vivian de fatima salazar d": "Vivian de Fátima Salazar",
  "cred salario dimed sa distribuidora de medic": "Crédito Salário Farmácias Panvel",
  "pcc bco age cta": "Crédito Salário Farmácias Panvel",
  "corban din o proprio favorecido": "Carlos Eduardo Calçada",
  "net": "Operadoras (Net/Claro)",
  "vetorial": "Operadoras (Net/Claro)",
  "claro": "Operadoras (Net/Claro)",
  "claro net": "Operadoras (Net/Claro)",
  "claro s a": "Operadoras (Net/Claro)",
  "pagamento fatura": "Pagamento Fatura",
  "pagto fatura": "Pagamento Fatura",
  "pagto fatura cartao": "Pagamento Fatura",
  "pg fatura cartao": "Pagamento Fatura",
  "pagamento de fatura": "Pagamento Fatura",
  "pagamento conta": "Pagamento Contas",
  "pagamento de conta": "Pagamento Contas",
  "pagto conta": "Pagamento Contas",
  "pgto conta": "Pagamento Contas",
  "pagamento de contas": "Pagamento Contas",
  "pagto de contas": "Pagamento Contas",
  "pagamento de titulo": "Pagamento Contas",
  "pagamento titulo": "Pagamento Contas",
  "pagto titulo": "Pagamento Contas",
  "pix enviado": "PIX Enviado",
  "pix trans": "PIX Enviado",
  "pix transf": "PIX Enviado",
  "pix transferencia": "PIX Enviado",
  "pix recebido": "PIX Recebido",
  "pix receb": "PIX Recebido",
  "pix credito": "PIX Recebido",
  "transferencia recebida": "PIX Recebido",
  "transf recebida": "PIX Recebido",
  "cred pix": "PIX Recebido",
  "ted recebida": "PIX Recebido",
  "ted credito": "PIX Recebido",
  "transferencia enviada": "Transferência Interna",
  "transf enviada": "Transferência Interna",
  "ted enviada": "Transferência Interna",
  "ted debito": "Transferência Interna",
  "doc e ted": "Transferência Interna",
  "doc/ted": "Transferência Interna",
  "transferencia": "Transferência Interna",
  "transf": "Transferência Interna",
  "aplicacao": "Aplicação",
  "aplic": "Aplicação",
  "investimento": "Aplicação",
  "aplic invest": "Aplicação",
  "aplicacao invest": "Aplicação",
  "resgate": "Resgate",
  "resg": "Resgate",
  "resgate invest": "Resgate",
  "resgate automatico": "Resgate",
  "compra cartao": "Compra Cartão",
  "compra c debito": "Compra Cartão",
  "compra cartao debito": "Compra Cartão",
  "compra debito": "Compra Cartão",
  "compra no debito": "Compra Cartão",
  "saque": "Saque",
  "saque cx": "Saque",
  "saque 24h": "Saque",
  "saque atm": "Saque",
  "saque no exterior": "Saque",
  "iof": "Impostos (IOF)",
  "iof imposto": "Impostos (IOF)",
  "imposto": "Impostos (IOF)",
  "encargos": "Tarifas Bancárias",
  "tar": "Tarifas Bancárias",
  "tarifa": "Tarifas Bancárias",
  "tarifa bancaria": "Tarifas Bancárias",
  "tar servicos": "Tarifas Bancárias",
  "tarifa servicos": "Tarifas Bancárias",
  "manutencao conta": "Tarifas Bancárias",
  "juros": "Juros",
  "juros cheque esp": "Juros",
  "juros adiant": "Juros",
  "estorno": "Estorno",
  "estorno debito": "Estorno",
  "estorno credito": "Estorno",
  "devolucao": "Estorno",
  "reembolso": "Estorno",
  "cred salario": "Crédito Salário",
  "credito salario": "Crédito Salário",
  "remuneracao": "Crédito Salário",
  "ifood": "Alimentação (iFood)",
  "ifood br": "Alimentação (iFood)",
  "ifood com": "Alimentação (iFood)",
  "netflix": "Assinaturas (Netflix)",
  "netflix com": "Assinaturas (Netflix)",
  "spotify": "Assinaturas (Spotify)",
  "spotify ab": "Assinaturas (Spotify)",
  "amazon": "Compras (Amazon)",
  "amazon br": "Compras (Amazon)",
  "amz": "Compras (Amazon)",
  "amazon prime": "Assinaturas (Amazon Prime)",
  "prime video": "Assinaturas (Amazon Prime)",
  "mercadolivre": "Compras (Mercado Livre)",
  "mercado livre": "Compras (Mercado Livre)",
  "mercadopago": "Compras (Mercado Livre)",
  "mercado pago": "Compras (Mercado Livre)",
  "posto": "Combustível (Posto)",
  "combustivel": "Combustível (Posto)",
  "shell": "Combustível (Posto)",
  "ipiranga": "Combustível (Posto)",
  "petrobras": "Combustível (Posto)",
  "farmacia": "Saúde (Farmácia)",
  "drogaria": "Saúde (Farmácia)",
  "panvel": "Saúde (Farmácia)",
  "raia": "Saúde (Farmácia)",
  "pacheco": "Saúde (Farmácia)",
  "associacao": "Associação",
  "sindicato": "Associação",
  "supermercado": "Mercado",
  "mercado": "Mercado",
  "zaffari": "Mercado (Zaffari)",
  "nacional": "Mercado (Nacional)",
  "carrefour": "Mercado (Carrefour)",
  "big": "Mercado (Big)",
  "restaurante": "Alimentação (Restaurante)",
  "lanches": "Alimentação (Restaurante)",
  "lancheria": "Alimentação (Restaurante)",
  "bar": "Alimentação (Restaurante)",
  "cafe": "Alimentação (Restaurante)",
  "padaria": "Alimentação (Restaurante)",
  "estacionamento": "Transporte (Estacionamento)",
  "zona azul": "Transporte (Estacionamento)",
  "safe park": "Transporte (Estacionamento)",
  "estapar": "Transporte (Estacionamento)",
  "azul estac": "Transporte (Estacionamento)",
  "pedagio": "Transporte (Pedágio)",
  "sem parar": "Transporte (Pedágio)",
  "cobranca pedagio": "Transporte (Pedágio)",
  "pe na estrada": "Transporte (Pedágio)",
  "99": "Transporte (99 App)",
  "99 app": "Transporte (99 App)",
  "99tecnologia": "Transporte (99 App)",
  "cabify": "Transporte (Cabify)",
  "petz": "Petshop",
  "pet shop": "Petshop",
  "cobasi": "Petshop",
  "clinica veterinaria": "Petshop",
  "veterinaria": "Petshop",
  "cvc": "Viagem (CVC)",
  "decolar": "Viagem (Decolar)",
  "latam": "Viagem (Azul/Gol/Latam)",
  "azul": "Viagem (Azul/Gol/Latam)",
  "gol": "Viagem (Azul/Gol/Latam)",
  "booking": "Viagem (Booking/Hotel)",
  "airbnb": "Viagem (Booking/Hotel)",
  "hotel": "Viagem (Booking/Hotel)",
  "pousada": "Viagem (Booking/Hotel)",
  "cea": "Vestuário (Roupas)",
  "renner": "Vestuário (Roupas)",
  "zara": "Vestuário (Roupas)",
  "lojas renner": "Vestuário (Roupas)",
  "magazine luiza": "Compras (Magazine Luiza)",
  "magalu": "Compras (Magazine Luiza)",
  "casas bahia": "Compras (Casas Bahia)",
  "ponto frio": "Compras (Ponto Frio)",
  "apple": "Tecnologia (Apple)",
  "apple com": "Tecnologia (Apple)",
  "google": "Tecnologia (Google)",
  "microsoft": "Tecnologia (Microsoft)",
  "samsung": "Tecnologia (Samsung)",
  "dell": "Tecnologia (Dell)",
  "steam": "Games (Steam)",
  "steamgames": "Games (Steam)",
  "nuuvem": "Games (Nuuvem)",
  "playstation": "Games (Playstation)",
  "xbox": "Games (Xbox)",
  "nintendo": "Games (Nintendo)",
  "riot games": "Games (Riot)",
  "blizzard": "Games (Blizzard)",
  "picpay": "Pagamentos (PicPay)",
  "paypal": "Pagamentos (PayPal)",
  "pagseguro": "Pagamentos (PagSeguro)",
  "sumup": "Pagamentos (SumUp)",
  "cielo": "Pagamentos (Cielo)",
  "rede": "Pagamentos (Rede)",
  "getnet": "Pagamentos (Getnet)",
  "stone": "Pagamentos (Stone)",
  "ebanx": "Pagamentos (Ebanx)",
  "academia": "Saúde (Academia)",
  "smart fit": "Saúde (Academia)",
  "bluefit": "Saúde (Academia)",
  "bodytech": "Saúde (Academia)",
  "plano de saude": "Saúde (Plano)",
  "unimed": "Saúde (Plano)",
  "amil": "Saúde (Plano)",
  "bradesco saude": "Saúde (Plano)",
  "sulamerica": "Saúde (Plano)",
  "hapvida": "Saúde (Plano)",
  "notredame": "Saúde (Plano)",
  "odontoprev": "Saúde (Plano)",
  "seguro": "Seguros",
  "seguro auto": "Seguros",
  "seguro vida": "Seguros",
  "porto seguro": "Seguros",
  "tokio marine": "Seguros",
  "allianz": "Seguros",
  "liberty": "Seguros",
  "mapfre": "Seguros",
  "chubb": "Seguros",
  "educacao": "Educação",
  "escola": "Educação",
  "faculdade": "Educação",
  "universidade": "Educação",
  "curso": "Educação",
  "udemy": "Educação",
  "coursera": "Educação",
  "alura": "Educação",
  "hotmart": "Educação",
  "doacao": "Doação",
  "caridade": "Doação",
  "igreja": "Doação",
  "dizimo": "Doação",
  "imoveis": "Casa (Imobiliária)",
  "aluguel": "Casa (Aluguel)",
  "condominio": "Casa (Condomínio)",
  "iptu": "Casa (Impostos)",
  "ipva": "Transporte (Impostos)",
  "dpvat": "Transporte (Impostos)",
  "licenciamento": "Transporte (Impostos)",
  "multa": "Transporte (Impostos)",
  "agua": "Casa (Contas)",
  "luz": "Casa (Contas)",
  "gas": "Casa (Contas)",
  "internet": "Casa (Contas)",
  "telefone": "Casa (Contas)",
  "tv a cabo": "Casa (Contas)",
  "ceee": "Casa (Contas)",
  "rge": "Casa (Contas)",
  "corsan": "Casa (Contas)",
  "dmae": "Casa (Contas)",
  "cpfl": "Casa (Contas)",
  "enel": "Casa (Contas)",
  "light": "Casa (Contas)",
  "comgas": "Casa (Contas)",
  "oi": "Operadoras (Net/Claro)",
  "tim": "Operadoras (Net/Claro)",
  "vivo": "Operadoras (Net/Claro)",
  "claro tv": "Operadoras (Net/Claro)",
  "sky": "Operadoras (Net/Claro)",
  "financiamento": "Contas/Financiamentos",
  "emprestimo": "Contas/Financiamentos",
  "parc": "Contas/Financiamentos",
  "prestacao": "Contas/Financiamentos",
  "boleto": "Pagamento Contas",
  "pagamento boleto": "Pagamento Contas",
  "pagto boleto": "Pagamento Contas",
  "o proprio favorecido": "O Próprio Favorecido"
};


/* ======================================================================== */
/* PARSER DE CSV (INTACTO - EduBiru.HTML + Correção)    */
/* ======================================================================== */

/**
 * Faz o parsing do texto do CSV.
 * Esta é a função MANTIDA do EduBiru.HTML, otimizada para Bradesco/Itaú.
 * (Agora corrigida para pular o lixo do cabeçalho)
 * @param {string} text - O conteúdo bruto do CSV.
 */
function parseCSVText(text) {
  const lines = text.split('\n');
  let data = [];
  let headers = [];
  let headerFound = false;
  let continuation = null; // Armazena a linha parcial
  
  // *** A CORREÇÃO ESTÁ AQUI ***
  // Em vez de assumir a primeira linha, procuramos pela linha de cabeçalho.
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Se estamos em uma linha de continuação
    if (continuation) {
      // O Bradesco quebra linhas e o histórico começa com espaço.
      // Se a linha começar com espaço ou não tiver data, é continuação.
      const isContinuationLine = line.startsWith(' ') || !/^\d{2}\/\d{2}\/\d{2,4}/.test(line);
      
      if (isContinuationLine) {
        // Remove aspas e excesso de lixo (ex: ;;;;)
        const cleanContinuation = line.replace(/;"/g, '').replace(/"/g, '').replace(/;+$/, '').trim();
        continuation.hist += ' ' + cleanContinuation;
        continue;
      } else {
        // Não era continuação, salva a linha anterior e processa a atual
        data.push(continuation);
        continuation = null;
      }
    }

    // Detecção de Cabeçalho (robusta)
    if (!headerFound) {
      const lowerLine = line.toLowerCase();
      // Procura pelas palavras-chave que DEFINEM o cabeçalho
      if (lowerLine.includes('data') && lowerLine.includes('histórico') && (lowerLine.includes('crédito') || lowerLine.includes('valor'))) {
        
        // Detecta o separador (geralmente ; mas pode ser ,)
        const separator = line.includes(';') ? ';' : ',';
        headers = line.split(separator).map(h => h.trim().replace(/"/g, ''));
        
        // Remove colunas vazias no final (ex: o 'Saldo (R$);' do CSV original)
        while (headers.length > 0 && headers[headers.length - 1] === '') {
          headers.pop();
        }
        
        headerFound = true;
        continue; // Pula a linha do cabeçalho
      }
      
      // Se não achou o cabeçalho, continua pulando (Ex: "Extrato de: Ag: 310...")
      continue; 
    }
    
    // *** FIM DA CORREÇÃO DE CABEÇALHO ***

    // Processamento das Linhas de Dados
    // Detecta o separador (robusto para ponto-e-vírgula ou vírgula)
    const separator = line.includes(';') ? ';' : ',';
    // Divide a linha. O CSV do Bradesco pode ter colunas vazias no final (;;;)
    // Usamos o 'headers.length' como guia
    const values = line.split(separator).map(v => v.trim());

    let transaction = {};

    // --- Tratamento Bradesco (Crédito/Débito separados) ---
    // (Usa 'includes' para ser flexível com "Crédito (R$)" ou só "Crédito")
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('data'));
    const histIdx = headers.findIndex(h => h.toLowerCase().includes('histórico'));
    const creditIdx = headers.findIndex(h => h.toLowerCase().includes('crédito'));
    const debitIdx = headers.findIndex(h => h.toLowerCase().includes('débito'));

    if (creditIdx !== -1 || debitIdx !== -1) {
      const dateStr = values[dateIdx];
      let hist = values[histIdx] || '';
      // Usa || '0' para garantir que não dê NaN
      const creditStr = (creditIdx !== -1 ? values[creditIdx] : '0') || '0';
      const debitStr = (debitIdx !== -1 ? values[debitIdx] : '0') || '0';

      const date = parseDate(dateStr); // USA A FUNÇÃO NOVA
      if (!date) continue; // Pula linha se a data for inválida (ex: "SALDO ANTERIOR")

      const credit = parseValue(creditStr); // USA A FUNÇÃO NOVA
      const debit = parseValue(debitStr);   // USA A FUNÇÃO NOVA
      const value = credit > 0 ? credit : -Math.abs(debit);

      transaction = { date, hist, value };
    }
    // --- Tratamento Itaú/Genérico (Valor único) ---
    else {
      const valueIdx = headers.findIndex(h => h.toLowerCase().includes('valor'));
      if (valueIdx === -1) continue; // Formato desconhecido
        
      const dateStr = values[dateIdx];
      let hist = values[histIdx] || '';
      const valueStr = values[valueIdx] || '0';

      const date = parseDate(dateStr); // USA A FUNÇÃO NOVA
      if (!date) continue;

      const value = parseValue(valueStr); // USA A FUNÇÃO NOVA
      transaction = { date, hist, value };
    }

    // Verifica se a linha é uma continuação (Bradesco)
    // Se o histórico não terminar com "..." e não tiver valor, é uma linha que será continuada
    if (transaction.hist && !transaction.hist.endsWith('...') && transaction.value === 0 && !continuation) {
      continuation = transaction;
    } else {
      // Linha normal ou fim de uma continuação
      if (continuation) {
        // Anexa o histórico da linha atual (que tem o valor)
        continuation.hist += ' ' + transaction.hist.trim();
        continuation.value = transaction.value;
        data.push(continuation);
        continuation = null;
      } else {
        // Só adiciona se tiver valor (ignora "SALDO ANTERIOR" com valor 0)
        if (transaction.value !== 0) {
          data.push(transaction);
        }
      }
    }
  } // Fim do loop

  // Se sobrou uma continuação no final
  if (continuation && continuation.value !== 0) {
    data.push(continuation);
  }

  if (data.length === 0) {
    throw new Error("Nenhuma transação válida encontrada. O parser pode não ter achado o cabeçalho (Data, Histórico, Valor/Crédito) ou as datas/valores.");
  }

  RAW_DATA = data;
}


/* ======================================================================== */
/* LÓGICA DE PROCESSAMENTO E GRUPO                    */
/* ======================================================================== */

/**
 * Limpa o nome bruto da transação, removendo lixo.
 * @param {string} name - O nome bruto (ex: "PIX Enviado - João da Silva")
 * @returns {string} - O nome limpo (ex: "João da Silva")
 */
function cleanRawName(name) {
  if (!name) return "Desconhecido";
  
  // Remove prefixos comuns e lixo
  let cleaned = name
    // Prefixos de PIX/TED/DOC/Pagamento
    .replace(/^(Pix Recebido|Pix Enviado|Pix Trans|PIX TRANS|PIX ENVIADO|PIX RECEBIDO|TED Recebida|TED Enviada|DOC\s?E\s?TED|Pagamento Conta|Pagamento Fatura|Pagamento de Conta|Pagto Fatura|Pagto Conta|Compra Cartão|Compra C Debito|COMPRA C\/DEBITO|Transferência Enviada|Transf Enviada)\s*[-–\s]*/i, '')
    // Históricos de continuação do Bradesco (ex: "Rem: Carlos Eduardo Calcad 24/04")
    .replace(/^(Rem:|Des:)\s*/i, '')
    .replace(/pagamento\s*t[íi]tulo\s*/i, '')
    .replace(/TBI\s\d+\.\d+\.\d+\.\d+/, '') // Remove IPs de TBI
    .replace(/\d{2}\/\d{2}$/, '') // Remove data no final (ex: "24/04")
    .replace(/\s{2,}/g, ' ') // Remove espaços extras
    .trim();

  // Se depois da limpeza não sobrar nada, retorna "Desconhecido"
  return cleaned || "Desconhecido";
}

/**
 * Gera uma chave canônica (minúscula, sem acentos) para usar nos aliases.
 * @param {string} s - A string de entrada.
 * @returns {string} - A chave limpa.
 */
function canonicalKey(s) {
  if (!s) return "";
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres não-alfanuméricos
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Encontra o nome "limpo" (alias) para uma transação.
 * @param {string} rawName - O histórico bruto.
 * @returns {string} - O nome limpo (alias) ou o nome tratado.
 */
function getCleanName(rawName) {
  const cleaned = cleanRawName(rawName);
  const key = canonicalKey(cleaned);
  
  // 1. Tenta achar um alias exato
  if (NAME_ALIASES[key]) {
    return NAME_ALIASES[key];
  }
  
  // 2. Tenta achar um alias parcial (mais lento, mas mais flexível)
  // Itera pelas chaves de alias e vê se alguma delas está contida no 'key'
  for (const aliasKey in NAME_ALIASES) {
    if (key.includes(aliasKey)) {
      return NAME_ALIASES[aliasKey];
    }
  }

  // 3. Se 'groupUnknown' estiver ativo e não achou alias, agrupa
  if (FILTERS.groupUnknown) {
    return "Transações Não Agrupadas";
  }
  
  // 4. Se não, retorna o nome capitalizado
  return capitalizeWords(cleaned);
}

/**
 * Capitaliza palavras (ex: "JOÃO DA SILVA" -> "João da Silva").
 * @param {string} s - A string de entrada.
 * @returns {string} - A string capitalizada.
 */
function capitalizeWords(s) {
  if (!s) return "";
  const exceptions = new Set(['de', 'do', 'da', 'e', 'em', 'para', 'com', 'a', 'o', 'as', 'os']);
  return s.toLowerCase().split(' ').map((word, index) => {
    if (!word) return '';
    if (index > 0 && exceptions.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Processa os dados brutos (RAW_DATA) e os agrupa.
 */
function processData() {
  if (RAW_DATA.length === 0) {
    PROCESSED_DATA = [];
    ALL_YEARS = [];
    return;
  }

  const groups = new Map();
  const years = new Set();

  for (const t of RAW_DATA) {
    if (!t.date) continue;
    
    years.add(t.date.getFullYear());
    
    // Aplica filtro de ano AQUI
    if (CURRENT_YEARS.length > 0 && !CURRENT_YEARS.includes(t.date.getFullYear())) {
      continue;
    }

    const cleanName = getCleanName(t.hist);
    
    if (!groups.has(cleanName)) {
      groups.set(cleanName, {
        name: cleanName,
        transactions: [],
        credit: 0,
        debit: 0,
        balance: 0,
        count: 0,
        isIgnored: IGNORE_NAMES_REGEX.test(cleanName) // Marca se é ignorado
      });
    }

    const group = groups.get(cleanName);
    group.transactions.push(t);
    group.count++;
    
    if (t.value > 0) {
      group.credit += t.value;
    } else {
      group.debit += t.value;
    }
    group.balance += t.value;
  }
  
  // Salva todos os anos (para os botões de filtro)
  // Só atualiza se for a primeira carga ou se os anos mudarem
  const newYears = Array.from(years).sort((a, b) => b - a);
  if (newYears.join(',') !== ALL_YEARS.join(',')) {
    ALL_YEARS = newYears;
  }

  // Converte o Map para Array
  PROCESSED_DATA = Array.from(groups.values());
  applyFiltersAndSort();
}

/**
 * Aplica os filtros de UI (busca, checkboxes) aos dados processados.
 */
function applyFiltersAndSort() {
  const search = canonicalKey(FILTERS.search);

  let data = PROCESSED_DATA;
  
  // 1. Filtro 'Exibir Ignorados'
  if (!FILTERS.showIgnored) {
    data = data.filter(g => !g.isIgnored);
  }

  // 2. Filtro de Busca (procura no nome do grupo ou nas transações)
  if (search) {
    data = data.filter(group => {
      // 1. Verifica o nome do grupo
      if (canonicalKey(group.name).includes(search)) {
        return true;
      }
      // 2. Verifica o histórico das transações filhas
      for (const t of group.transactions) {
        if (canonicalKey(t.hist).includes(search)) {
          return true;
        }
      }
      return false;
    });
  }
  
  // 3. Ordenação
  data.sort((a, b) => {
    let valA, valB;
    const { key, order } = CURRENT_SORT;
    
    switch(key) {
      case 'name':
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        break;
      case 'count':
        valA = a.count;
        valB = b.count;
        break;
      case 'credit':
        valA = a.credit;
        valB = b.credit;
        break;
      case 'debit':
        valA = Math.abs(a.debit); // Compara valores absolutos
        valB = Math.abs(b.debit);
        break;
      default:
        return 0;
    }

    if (valA > valB) return order === 'asc' ? 1 : -1;
    if (valA < valB) return order === 'asc' ? -1 : 1;
    return 0;
  });
  
  // Se a ordenação for por valor (crédito/débito/contagem), o padrão é 'desc'
  if (CURRENT_SORT.key !== 'name' && CURRENT_SORT.order === 'asc') {
    data.reverse();
  }

  FILTERED_DATA = data;
  
  // Reseta a paginação do acordeão
  ACCORDION_PAGE = 1;
}

/* ======================================================================== */
/* FUNÇÕES DE FORMATAÇÃO E UTILIDADE                  */
/* ======================================================================== */

/**
 * Formata um número para BRL (R$ 1.234,56).
 * @param {number} value - O valor numérico.
 * @returns {string} - A string formatada.
 */
function formatCurrency(value) {
  if (isNaN(value)) value = 0;
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata uma data (ex: 10/11/2025).
 * @param {Date} date - O objeto Date.
 * @returns {string} - A string formatada.
 */
function formatDate(date) {
  if (!date) return 'N/A';
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Gera um debounce para inputs (atrasa a execução).
 * @param {Function} func - A função a ser executada.
 * @param {number} delay - O tempo em ms.
 * @returns {Function} - A função "debounced".
 */
function debounce(func, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/* ======================================================================== */
/* PARTE 2: RENDERIZAÇÃO E EVENTOS                                          */
/* ======================================================================== */

/* ======================================================================== */
/* LÓGICA DE RENDERIZAÇÃO (UI)                      */
/* ======================================================================== */

/**
 * Atualiza todos os componentes da UI (cards, gráficos, acordeão).
 */
function updateAll() {
  // 1. Processa os dados (agrupa, filtra por ano)
  processData();
  
  // 2. Renderiza os componentes principais
  renderSummaryCards();
  renderYearFilters(); // Renderiza botões de ano
  renderAccordion();
  
  // 3. Renderiza os gráficos
  renderDailyChart();
  renderMonthlyChart();
  renderBarChart();
  renderActivityCalendar(); // Novo heatmap
}

/**
 * Atualiza os cards de sumário (Total Crédito, Débito, Saldo).
 */
function renderSummaryCards() {
  // Usa PROCESSED_DATA para os totais, mas filtra os ignorados se 'showIgnored' for falso
  const dataToSum = FILTERS.showIgnored ? PROCESSED_DATA : PROCESSED_DATA.filter(g => !g.isIgnored);

  let totalCredit = 0;
  let totalDebit = 0;
  let totalTransactions = 0;

  for (const group of dataToSum) {
    totalCredit += group.credit;
    totalDebit += group.debit;
    totalTransactions += group.count;
  }
  const totalBalance = totalCredit + totalDebit;

  document.getElementById('totalCredit').textContent = formatCurrency(totalCredit);
  document.getElementById('totalDebit').textContent = formatCurrency(totalDebit);
  document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
  document.getElementById('totalTransactions').textContent = totalTransactions;

  // Atualiza classes de cor do Saldo
  const balanceEl = document.getElementById('totalBalance');
  balanceEl.classList.remove('positive', 'negative', 'neutral');
  if (totalBalance > 0) balanceEl.classList.add('positive');
  else if (totalBalance < 0) balanceEl.classList.add('negative');
  else balanceEl.classList.add('neutral');
}

/**
 * Renderiza os botões de filtro de ano.
 */
function renderYearFilters() {
  const container = document.getElementById('year-filter-container');
  if (!container) return;
  
  container.innerHTML = ''; // Limpa antes de renderizar
  
  // Botão "Todos os Anos"
  const allCard = document.createElement('div');
  allCard.className = 'year-card';
  allCard.textContent = 'Todos';
  if (CURRENT_YEARS.length === 0) {
    allCard.classList.add('active');
  }
  allCard.addEventListener('click', () => {
    CURRENT_YEARS = [];
    saveFilters(); // Salva estado dos filtros
    updateAll();
  });
  container.appendChild(allCard);

  // Botões para cada ano
  ALL_YEARS.forEach(year => {
    const card = document.createElement('div');
    card.className = 'year-card';
    card.textContent = year;
    if (CURRENT_YEARS.includes(year)) {
      card.classList.add('active');
    }
    card.addEventListener('click', () => {
      // Lógica de seleção múltipla (ou única, se preferir)
      // Aqui, implementamos seleção única para simplificar
      if (CURRENT_YEARS.includes(year)) {
        CURRENT_YEARS = []; // Desseleciona se clicar no ativo
      } else {
        CURRENT_YEARS = [year]; // Seleciona o ano
      }
      saveFilters();
      updateAll();
    });
    container.appendChild(card);
  });
}

/**
 * Renderiza o acordeão de transações (paginado).
 */
function renderAccordion() {
  const container = document.getElementById('accordion-container');
  const loadMoreWrapper = document.getElementById('load-more-wrapper');
  if (!container) return;

  // Se for página 1, limpa o container
  if (ACCORDION_PAGE === 1) {
    container.innerHTML = '';
  }

  const start = (ACCORDION_PAGE - 1) * ACCORDION_PAGE_SIZE;
  const end = ACCORDION_PAGE * ACCORDION_PAGE_SIZE;
  const dataPage = FILTERED_DATA.slice(start, end);

  if (dataPage.length === 0 && ACCORDION_PAGE === 1) {
    container.innerHTML = '<p style="padding: 1.5rem; text-align: center; color: var(--muted);">Nenhuma transação encontrada para os filtros atuais.</p>';
    loadMoreWrapper.classList.add('hidden');
    return;
  }

  const fragment = document.createDocumentFragment();
  dataPage.forEach(group => {
    fragment.appendChild(createAccordionGroup(group));
  });
  container.appendChild(fragment);

  // Controla visibilidade do botão "Carregar Mais"
  if (FILTERED_DATA.length > end) {
    loadMoreWrapper.classList.remove('hidden');
  } else {
    loadMoreWrapper.classList.add('hidden');
  }
}

/**
 * Cria um único grupo (cabeçalho + conteúdo) do acordeão.
 * @param {object} group - O objeto do grupo.
 * @returns {HTMLElement} - O elemento do grupo.
 */
function createAccordionGroup(group) {
  const groupWrapper = document.createElement('div');
  
  const header = document.createElement('div');
  header.className = 'accordion-group-header';
  
  // Checkbox de seleção em massa (agora no cabeçalho do grupo)
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'checkbox-label';
  // Evita que o clique no checkbox abra o acordeão
  checkboxLabel.addEventListener('click', e => e.stopPropagation()); 
  
  checkboxLabel.innerHTML = `
    <input type"checkbox" class="group-select-checkbox" data-group-name="${group.name}">
    <span class="checkbox-custom">
      <svg class="icon"><use href="#icon-check"></use></svg>
    </span>
  `;

  // Nome do Grupo
  const groupName = document.createElement('div');
  groupName.className = 'group-name';
  groupName.textContent = group.name;
  if (group.isIgnored) {
    groupName.classList.add('ignored-item');
  }
  
  // Evento de Duplo Clique para Renomear (do Dashboard.html)
  groupName.addEventListener('dblclick', e => {
    e.stopPropagation();
    const newName = prompt(`Renomear grupo "${group.name}":`, group.name);
    if (newName && newName.trim() !== group.name) {
      // Encontra a chave de alias antiga (se existir)
      const oldKey = Object.keys(NAME_ALIASES).find(k => NAME_ALIASES[k] === group.name);
      if (oldKey) {
        NAME_ALIASES[oldKey] = newName; // Atualiza o alias existente
      } else {
        // Se não tinha alias, cria um novo (pode ser complexo)
        // Por segurança, vamos focar em mover transações para criar aliases
        showNotification(`Grupo ${group.name} renomeado para ${newName} (visualmente). Use o modal 'Mover' para criar aliases permanentes.`, 'warning');
      }
      // Atualiza o JSON no editor e salva
      document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
      saveAliasesToStorage();
      
      // Re-processa e re-renderiza
      fullReRender();
    }
  });

  // Valores e Contagem
  const groupCount = document.createElement('div');
  groupCount.className = 'group-count';
  groupCount.textContent = `${group.count} tx`;
  
  const groupDebit = document.createElement('div');
  groupDebit.className = 'group-value negative';
  groupDebit.textContent = formatCurrency(group.debit);
  
  const groupCredit = document.createElement('div');
  groupCredit.className = 'group-value positive';
  groupCredit.textContent = formatCurrency(group.credit);

  // Controles (Mover, Ignorar)
  const groupControls = document.createElement('div');
  groupControls.className = 'group-controls';
  groupControls.innerHTML = `
    <button class="btn btn-icon btn-sm move-group-btn" title="Mover todas as ${group.count} transações deste grupo">
      <svg class="icon"><use href="#icon-move"></use></svg>
    </button>
    <button class="btn btn-icon btn-sm ignore-group-btn" title="Ignorar/Re-incluir este grupo (PIX Interno, etc.)">
      <svg class="icon"><use href="#icon-ignore"></use></svg>
    </button>
  `;
  // Evita que o clique nos botões abra o acordeão
  groupControls.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });
  
  // Adiciona listeners aos botões de controle
  groupControls.querySelector('.move-group-btn').addEventListener('click', () => {
    // Coleta todos os históricos brutos deste grupo
    const rawHists = group.transactions.map(t => cleanRawName(t.hist));
    openMoveModal(rawHists);
  });
  
  groupControls.querySelector('.ignore-group-btn').addEventListener('click', () => {
    const key = canonicalKey(group.name);
    if (IGNORE_NAMES_REGEX.test(group.name)) {
      showNotification("Não é possível alterar o status de ignorado de um grupo padrão (Ex: Crédito Salário).", "warning");
    } else if (NAME_ALIASES[key] && IGNORE_NAMES_REGEX.test(NAME_ALIASES[key])) {
      // Se estava ignorado (ex: movido para 'Pagamento Fatura'), reverte
      delete NAME_ALIASES[key];
      showNotification(`Grupo "${group.name}" será re-incluído.`, 'success');
    } else {
      // Ignora (move para 'Pagamento Fatura' como padrão)
      NAME_ALIASES[key] = 'Pagamento Fatura'; // Ou outro grupo 'ignorado'
      showNotification(`Grupo "${group.name}" será ignorado.`, 'success');
    }
    document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
    saveAliasesToStorage();
    fullReRender();
  });


  // Conteúdo (Tabela de Transações)
  const content = document.createElement('div');
  content.className = 'accordion-group-content';
  content.innerHTML = `
    <table class="transaction-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Histórico</th>
          <th style="text-align: right;">Crédito</th>
          <th style="text-align: right;">Débito</th>
        </tr>
      </thead>
      <tbody>
        ${group.transactions.map(t => `
          <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.hist}</td>
            <td class="positive">${t.value > 0 ? formatCurrency(t.value) : ''}</td>
            <td class="negative">${t.value < 0 ? formatCurrency(t.value) : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  // Montagem do Header
  header.appendChild(checkboxLabel);
  header.appendChild(groupName);
  header.appendChild(groupCount);
  header.appendChild(groupDebit);
  header.appendChild(groupCredit);
  header.appendChild(groupControls);
  
  // Lógica de Abrir/Fechar
  header.addEventListener('click', () => {
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
      header.classList.remove('active');
    } else {
      // Fecha todos os outros (opcional, mas bom para performance)
      // document.querySelectorAll('.accordion-group-content').forEach(c => c.style.maxHeight = null);
      // document.querySelectorAll('.accordion-group-header').forEach(h => h.classList.remove('active'));
      
      content.style.maxHeight = content.scrollHeight + 'px';
      header.classList.add('active');
    }
  });

  groupWrapper.appendChild(header);
  groupWrapper.appendChild(content);

  return groupWrapper;
}

/* ======================================================================== */
/* LÓGICA DOS GRÁFICOS (Chart.js + D3)                */
/* ======================================================================== */

/**
 * Renderiza o gráfico de Evolução Diária (Saldo).
 */
function renderDailyChart() {
  const ctx = document.getElementById('chartDaily')?.getContext('2d');
  if (!ctx) return;

  // Acumula saldo diário
  const dailyData = new Map();
  const dataToUse = (FILTERS.showIgnored ? RAW_DATA : RAW_DATA.filter(t => !IGNORE_NAMES_REGEX.test(getCleanName(t.hist))))
    .filter(t => CURRENT_YEARS.length === 0 || CURRENT_YEARS.includes(t.date.getFullYear())); // Filtra por ano

  // Ordena por data (IMPORTANTE para o saldo acumulado)
  dataToUse.sort((a, b) => a.date - b.date);

  let cumulativeBalance = 0;
  for (const t of dataToUse) {
    const dateStr = t.date.toISOString().split('T')[0];
    cumulativeBalance += t.value;
    dailyData.set(dateStr, cumulativeBalance);
  }

  const labels = Array.from(dailyData.keys());
  const data = Array.from(dailyData.values());

  const chartColors = getChartColors();

  if (chartDaily) chartDaily.destroy();
  chartDaily = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Saldo Acumulado',
        data: data,
        borderColor: chartColors.line,
        backgroundColor: chartColors.line + '33', // 33 = 20% opacity
        fill: true,
        tension: 0.1,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: { unit: 'month' },
          grid: { color: chartColors.grid },
          ticks: { color: chartColors.text }
        },
        y: {
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.text,
            callback: value => formatCurrency(value)
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `Saldo: ${formatCurrency(context.raw)}`
          }
        },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      }
    }
  });
}

/**
 * Renderiza o gráfico de Evolução Mensal (Crédito/Débito).
 */
function renderMonthlyChart() {
  const ctx = document.getElementById('chartMonthly')?.getContext('2d');
  if (!ctx) return;

  const dataToUse = FILTERS.showIgnored ? PROCESSED_DATA : PROCESSED_DATA.filter(g => !g.isIgnored);

  const monthlyData = new Map();

  dataToUse.forEach(group => {
    group.transactions.forEach(t => {
      const month = `${t.date.getFullYear()}-${String(t.date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData.has(month)) {
        monthlyData.set(month, { credit: 0, debit: 0 });
      }
      const data = monthlyData.get(month);
      if (t.value > 0) data.credit += t.value;
      else data.debit += t.value;
    });
  });

  const sortedMonths = Array.from(monthlyData.keys()).sort();
  const labels = sortedMonths.map(month => {
    const [year, m] = month.split('-');
    return `${m}/${year.slice(2)}`;
  });
  const credits = sortedMonths.map(month => monthlyData.get(month).credit);
  const debits = sortedMonths.map(month => Math.abs(monthlyData.get(month).debit));

  const chartColors = getChartColors();

  if (chartMonthly) chartMonthly.destroy();
  chartMonthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Crédito',
          data: credits,
          backgroundColor: chartColors.green,
        },
        {
          label: 'Débito',
          data: debits,
          backgroundColor: chartColors.red,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: chartColors.text }
        },
        y: {
          stacked: true,
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.text,
            callback: value => formatCurrency(value)
          }
        }
      },
      plugins: {
        legend: { labels: { color: chartColors.text } },
        tooltip: { callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.raw)}` } },
        zoom: {
          pan: { enabled: true, mode: 'x' },
          zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }
        }
      },
      // Evento de clique (do Dashboard.html)
      onClick: (e) => {
        const activePoints = chartMonthly.getElementsAtEventForMode(e, 'index', { intersect: true }, false);
        if (activePoints.length > 0) {
          const index = activePoints[0].index;
          const monthLabel = sortedMonths[index]; // ex: "2025-10"
          const [year, month] = monthLabel.split('-');
          // Filtra por esse mês (simulando busca)
          document.getElementById('mainSearch').value = `/${month}/${year}`;
          FILTERS.search = `/${month}/${year}`;
          saveFilters();
          // Re-renderiza acordeão
          applyFiltersAndSort();
          renderAccordion();
          showNotification(`Filtrando por ${month}/${year}`, 'success');
        }
      }
    }
  });
}

/**
 * Renderiza o gráfico Top 10 Destinatários/Fontes.
 */
function renderBarChart() {
  const ctx = document.getElementById('barChart')?.getContext('2d');
  if (!ctx) return;

  // Pega os 10 maiores (em valor absoluto)
  const top10 = (FILTERS.showIgnored ? PROCESSED_DATA : PROCESSED_DATA.filter(g => !g.isIgnored))
    .map(g => ({ name: g.name, value: g.balance, debit: g.debit, credit: g.credit }))
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
    .slice(0, 10)
    .reverse(); // Reverte para o maior ficar no topo no gráfico horizontal

  const labels = top10.map(g => g.name);
  const data = top10.map(g => g.value); // Pode ser positivo ou negativo
  
  const chartColors = getChartColors();
  
  const backgroundColors = data.map(value => 
    value > 0 ? chartColors.green + 'CC' : chartColors.red + 'CC' // CC = 80% opacity
  );

  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Saldo (Débito/Crédito)',
        data: data,
        backgroundColor: backgroundColors,
      }]
    },
    options: {
      indexAxis: 'y', // Gráfico de barras horizontal
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: chartColors.grid },
          ticks: {
            color: chartColors.text,
            callback: value => formatCurrency(value)
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: chartColors.text }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `Saldo: ${formatCurrency(context.raw)}`
          }
        }
      },
      // Evento de clique (do Dashboard.html)
      onClick: (e) => {
        const activePoints = barChart.getElementsAtEventForMode(e, 'index', { intersect: true }, false);
        if (activePoints.length > 0) {
          const index = activePoints[0].index;
          const groupName = labels[index];
          // Filtra por esse grupo
          document.getElementById('mainSearch').value = groupName;
          FILTERS.search = groupName;
          saveFilters();
          // Re-renderiza acordeão
          applyFiltersAndSort();
          renderAccordion();
          showNotification(`Filtrando por "${groupName}"`, 'success');
        }
      }
    }
  });
}

/**
 * Renderiza o Heatmap de Atividade (D3).
 * (Baseado no Dashboard.html)
 */
function renderActivityCalendar() {
  // *** AQUI ESTÁ A CORREÇÃO ANTI-TAUBATÉ ***
  // Se a biblioteca não carregou (meu erro no HTML), a 'CalendarHeatmap' não existe.
  // Esta checagem impede o erro 'CalendarHeatmap is not defined'.
  if (typeof CalendarHeatmap === 'undefined') {
    console.error("Biblioteca D3 CalendarHeatmap não carregou. Verifique o link CDN no HTML.");
    // Opcional: mostrar um erro na UI
    document.querySelector('#calendar-heatmap').innerHTML = '<p style="color: var(--red);">Erro: Biblioteca do Heatmap não carregou.</p>';
    return;
  }
  
  const containerId = '#calendar-heatmap';
  const tooltipId = '#heatmap-tooltip';
  
  // Limpa o heatmap anterior
  document.querySelector(containerId).innerHTML = '';
  
  const dataToUse = (FILTERS.showIgnored ? RAW_DATA : RAW_DATA.filter(t => !IGNORE_NAMES_REGEX.test(getCleanName(t.hist))))
    .filter(t => t.value < 0); // Apenas débitos

  // Agrupa débitos por dia
  const dailyDebits = new Map();
  let maxDebit = 0;
  
  for (const t of dataToUse) {
    const dateStr = t.date.toISOString().split('T')[0];
    const dayTotal = (dailyDebits.get(dateStr) || 0) + Math.abs(t.value);
    dailyDebits.set(dateStr, dayTotal);
    if (dayTotal > maxDebit) maxDebit = dayTotal;
  }
  
  const heatmapData = Array.from(dailyDebits.entries()).map(([date, value]) => ({
    date: new Date(date),
    value: value
  }));
  
  if (heatmapData.length === 0) return;

  const chartColors = getChartColors();

  // Configuração do heatmap
  calendarHeatmap = new CalendarHeatmap()
    .data(heatmapData)
    .selector(containerId)
    .tooltipEnabled(true)
    .tooltipUnit('Débito')
    .tooltipSelector(tooltipId)
    .setLegendColors(null, [chartColors.red, chartColors.orange, chartColors.green]) // Custom colors
    .setLegendColorRanges([maxDebit * 0.3, maxDebit * 0.6])
    .setEmptyCellColor(chartColors.grid)
    .onClick(data => {
      // Evento de clique (do Dashboard.html)
      if (data && data.date) {
        const dateStr = data.date.toLocaleDateString('pt-BR');
        document.getElementById('mainSearch').value = dateStr;
        FILTERS.search = dateStr;
        saveFilters();
        applyFiltersAndSort();
        renderAccordion();
        showNotification(`Filtrando por ${dateStr}`, 'success');
      }
    });

  calendarHeatmap(); // Renderiza o gráfico
}

/**
 * Renderiza o Modal de Resumo (Novo).
 */
function renderSummaryModal() {
  const ctx = document.getElementById('summaryChart')?.getContext('2d');
  const summaryTextEl = document.getElementById('summary-text');
  if (!ctx || !summaryTextEl) return;

  // Pega os 5 maiores débitos (excluindo ignorados)
  const top5Debits = PROCESSED_DATA
    .filter(g => !g.isIgnored && g.debit < 0)
    .sort((a, b) => a.debit - b.debit) // Sort by debit (most negative first)
    .slice(0, 5);

  if (top5Debits.length === 0) {
    summaryTextEl.textContent = "Sem dados de débito para exibir.";
    return;
  }

  const labels = top5Debits.map(g => g.name);
  const data = top5Debits.map(g => Math.abs(g.debit));
  const totalTop5 = data.reduce((a, b) => a + b, 0);

  // Texto de resumo
  const biggestGasto = top5Debits[0];
  summaryTextEl.innerHTML = `Seu maior gasto no período foi com <strong>${biggestGasto.name}</strong>, totalizando <strong>${formatCurrency(Math.abs(biggestGasto.debit))}</strong>.`;
  
  const chartColors = getChartColors();

  // Gráfico de Pizza (Doughnut)
  if (summaryChart) summaryChart.destroy();
  summaryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: 'Top 5 Gastos',
        data: data,
        backgroundColor: [
          chartColors.red + 'E6', // 90%
          chartColors.orange + 'CC', // 80%
          chartColors.accent + 'B3', // 70%
          chartColors.cyan + '99', // 60%
          chartColors.muted + '80', // 50%
        ],
        borderColor: chartColors.card,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: chartColors.text, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: context => {
              const label = context.label || '';
              const value = context.raw || 0;
              const percent = (value / totalTop5 * 100).toFixed(1);
              return `${label}: ${formatCurrency(value)} (${percent}%)`;
            }
          }
        }
      }
    }
  });
}


/* ======================================================================== */
/* LÓGICA DE EVENTOS (Cliques e Inputs)               */
/* ======================================================================== */

/**
 * Anexa todos os listeners de eventos da página.
 */
function setupEventListeners() {
  
  // --- Cabeçalho ---
  document.getElementById('fileInput').addEventListener('change', handleFileUpload);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('importBackupBtn').addEventListener('click', () => document.getElementById('backupInput').click());
  document.getElementById('backupInput').addEventListener('change', handleBackupImport);
  document.getElementById('exportBackupBtn').addEventListener('click', handleBackupExport);
  document.getElementById('printScreenBtn').addEventListener('click', handlePrintScreen);
  document.getElementById('summaryButton').addEventListener('click', openSummaryModal);
  document.getElementById('aliasEditorBtn').addEventListener('click', openAliasEditor);

  // --- Filtros ---
  document.getElementById('mainSearch').addEventListener('input', debounce(handleSearchInput, 300));
  document.getElementById('groupUnknown').addEventListener('change', handleFilterChange);
  document.getElementById('showIgnored').addEventListener('change', handleFilterChange);
  document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

  // --- Acordeão ---
  document.getElementById('loadMoreBtn').addEventListener('click', handleLoadMore);
  document.querySelector('.sort-controls').addEventListener('click', handleSortClick);

  // --- Modais (Fechar) ---
  document.getElementById('move-modal-close-btn').addEventListener('click', () => toggleModal('moveTransactionModal', false));
  document.getElementById('alias-editor-close-btn').addEventListener('click', () => toggleModal('aliasEditorModal', false));
  document.getElementById('summary-modal-close-btn').addEventListener('click', () => toggleModal('summaryModal', false));
  // Fecha modal ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        toggleModal(overlay.id, false);
      }
    });
  });

  // --- Modal Mover ---
  document.getElementById('move-group-search').addEventListener('input', debounce(handleMoveSearch, 200));
  document.getElementById('move-search-clear').addEventListener('click', clearMoveSearch);
  document.getElementById('confirmMoveBtn').addEventListener('click', handleConfirmMove);

  // --- Modal Aliases ---
  document.getElementById('saveAliasesBtn').addEventListener('click', handleSaveAliases);
}

/**
 * Loop de re-renderização total (após mudança de filtros ou dados).
 */
function fullReRender() {
  applyFiltersAndSort();
  renderSummaryCards();
  renderAccordion();
  renderDailyChart();
  renderMonthlyChart();
  renderBarChart();
  renderActivityCalendar();
}

// --- Handlers de Eventos ---

function handleFileUpload(e) {
  const file = e.target.files?.[0];
  const statusEl = document.getElementById('file-status');
  if (!file) return;

  statusEl.classList.remove('hidden', 'success', 'error');
  statusEl.textContent = '...';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      parseCSVText(text); // Função CORRIGIDA
      
      if (RAW_DATA.length === 0) {
        throw new Error("Nenhuma transação encontrada no arquivo.");
      }
      
      statusEl.textContent = '✓';
      statusEl.classList.add('success');
      showNotification(`${RAW_DATA.length} transações carregadas!`, 'success');
      
      // Reseta os filtros de ano e atualiza tudo
      ALL_YEARS = []; // Força a recriação dos botões de ano
      CURRENT_YEARS = [];
      updateAll();
      
      // Salva os dados brutos no localStorage (opcional, mas bom)
      // localStorage.setItem('fin_v5_raw_data', JSON.stringify(RAW_DATA)); // Cuidado, pode ser grande
      
    } catch (err) {
      console.error(err);
      statusEl.textContent = '❌';
      statusEl.classList.add('error');
      showNotification(`Erro ao ler CSV: ${err.message}`, 'error');
      RAW_DATA = [];
      updateAll();
    } finally {
      // Limpa o input para permitir carregar o mesmo arquivo de novo
      e.target.value = null; 
    }
  };
  
  reader.onerror = () => {
    statusEl.textContent = '❌';
    statusEl.classList.add('error');
    showNotification('Erro ao ler o arquivo.', 'error');
  };
  
  // Lê como ISO-8859-1 (Latin1) - a chave do parser do EduBiru
  reader.readAsText(file, 'ISO-8859-1');
}

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  
  // Atualiza o ícone
  const themeIcon = document.getElementById('themeToggle').querySelector('use');
  themeIcon.setAttribute('href', isLight ? '#icon-moon' : '#icon-sun');
  
  localStorage.setItem('fin_v5_theme', isLight ? 'light' : 'dark');

  // Recria os gráficos para aplicar as cores do novo tema
  // Atrasar a recriação melhora a percepção da transição
  setTimeout(() => {
    updateAll(); // Isso já recria todos os gráficos
  }, 50);
}

function handleBackupImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = e.target.result;
      const data = JSON.parse(json);
      
      // O backup pode conter aliases ou dados
      if (data.aliases) {
        NAME_ALIASES = data.aliases;
        document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
        saveAliasesToStorage();
        showNotification('Aliases importados com sucesso!', 'success');
        fullReRender();
      } else if (data.NAME_ALIASES) {
        // Formato antigo do EduBiru
        NAME_ALIASES = data.NAME_ALIASES;
        document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
        saveAliasesToStorage();
        showNotification('Aliases (formato antigo) importados!', 'success');
        fullReRender();
      } else {
        throw new Error("Arquivo JSON em formato inválido. Esperado {'aliases': {...}}");
      }
      
    } catch (err) {
      console.error(err);
      showNotification(`Erro ao importar backup: ${err.message}`, 'error');
    } finally {
      e.target.value = null; // Limpa o input
    }
  };
  reader.readAsText(file);
}

function handleBackupExport() {
  try {
    const data = {
      aliases: NAME_ALIASES,
      // Pode incluir filtros, etc. no futuro
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas_biru_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup de aliases exportado!', 'success');
  } catch (err) {
    console.error(err);
    showNotification('Erro ao exportar backup.', 'error');
  }
}

function handlePrintScreen() {
  showNotification('Gerando print da tela... Aguarde.', 'warning');
  const main = document.querySelector('main');
  
  // Oculta modais e botões de print para a captura
  document.querySelectorAll('.modal-overlay, .header-controls').forEach(el => el.style.visibility = 'hidden');
  
  html2canvas(main, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    useCORS: true,
    scale: 2, // Aumenta a resolução
  }).then(canvas => {
    // Tenta gerar PDF (como no code3.html)
    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'pt', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 40; // Margem
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 20, 20, pdfWidth, pdfHeight);
      pdf.save(`financas_biru_${new Date().toISOString().slice(0, 10)}.pdf`);
      showNotification('PDF gerado com sucesso!', 'success');
      
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      // Fallback para PNG se o PDF falhar
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `financas_biru_${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      showNotification('PDF falhou, exportando como PNG.', 'warning');
    }
    
  }).catch(err => {
    console.error("Erro no html2canvas:", err);
    showNotification('Erro ao gerar print.', 'error');
  }).finally(() => {
    // Restaura a visibilidade
    document.querySelectorAll('.modal-overlay, .header-controls').forEach(el => el.style.visibility = 'visible');
  });
}

function handleSearchInput(e) {
  FILTERS.search = e.target.value;
  saveFilters();
  applyFiltersAndSort();
  renderAccordion();
}

function handleFilterChange(e) {
  const { id, checked } = e.target;
  if (id === 'groupUnknown') FILTERS.groupUnknown = checked;
  if (id === 'showIgnored') FILTERS.showIgnored = checked;
  
  saveFilters();
  
  // 'groupUnknown' requer re-processamento total
  if (id === 'groupUnknown') {
    updateAll();
  } else {
    // 'showIgnored' só precisa filtrar e re-renderizar
    fullReRender();
  }
}

function clearFilters() {
  // Reseta estado
  FILTERS = { search: '', groupUnknown: false, showIgnored: true };
  CURRENT_YEARS = [];
  CURRENT_SORT = { key: 'name', order: 'asc' };
  saveFilters();
  
  // Reseta UI
  document.getElementById('mainSearch').value = '';
  document.getElementById('groupUnknown').checked = false;
  document.getElementById('showIgnored').checked = true;
  
  // Remove classe 'active' dos botões de ano e sorteio
  document.querySelectorAll('.year-card.active').forEach(el => el.classList.remove('active'));
  document.querySelector('.year-card').classList.add('active'); // Ativa "Todos"
  document.querySelectorAll('.sort-btn.active').forEach(el => el.classList.remove('active'));
  document.querySelector('.sort-btn[data-sort="name"]').classList.add('active');

  // Re-renderiza tudo
  updateAll();
  showNotification('Filtros limpos!', 'success');
}

function handleLoadMore() {
  ACCORDION_PAGE++;
  renderAccordion();
}

function handleSortClick(e) {
  const btn = e.target.closest('.sort-btn');
  if (!btn) return;

  const key = btn.dataset.sort;
  
  // Lógica de ordenação (toggle)
  if (CURRENT_SORT.key === key) {
    CURRENT_SORT.order = CURRENT_SORT.order === 'asc' ? 'desc' : 'asc';
  } else {
    CURRENT_SORT.key = key;
    // Padrão: nome 'asc', outros 'desc'
    CURRENT_SORT.order = key === 'name' ? 'asc' : 'desc';
  }
  
  // Atualiza UI dos botões
  document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Atualiza indicador de seta (opcional, mas legal)
  document.querySelectorAll('.sort-indicator').forEach(i => i.textContent = '');
  btn.querySelector('.sort-indicator').textContent = CURRENT_SORT.order === 'asc' ? ' ↑' : ' ↓';

  // Re-filtra e re-renderiza o acordeão
  applyFiltersAndSort();
  renderAccordion();
}

/* ======================================================================== */
/* LÓGICA DOS MODAIS (Mover, Aliases, Resumo)         */
/* ======================================================================== */

let currentMoveContext = { rawHists: [] }; // Contexto para o modal de mover

/**
 * Abre o modal de "Mover Transação".
 * @param {string[]} rawHists - Array de históricos brutos (limpos) a mover.
 */
function openMoveModal(rawHists) {
  currentMoveContext = { rawHists: Array.from(new Set(rawHists)) }; // Remove duplicatas
  
  // Atualiza título e descrição
  const count = currentMoveContext.rawHists.length;
  document.getElementById('move-modal-title').textContent = `Mover ${count} Transação(ões)`;
  document.getElementById('move-modal-description').textContent = `Mova "${currentMoveContext.rawHists[0]}" (e ${count-1} outras) para:`;

  // Reseta o input e a lista
  clearMoveSearch();
  
  // Checkbox "Salvar Alias" (padrão 'checked')
  document.getElementById('saveAliasCheckbox').checked = true;

  toggleModal('moveTransactionModal', true);
}

/**
 * Filtra a lista de grupos no modal de "Mover".
 */
function handleMoveSearch() {
  const search = document.getElementById('move-group-search').value;
  const clearBtn = document.getElementById('move-search-clear');
  clearBtn.style.display = search ? 'block' : 'none';
  renderMoveGroupList(search);
}

function clearMoveSearch() {
  document.getElementById('move-group-search').value = '';
  document.getElementById('move-search-clear').style.display = 'none';
  renderMoveGroupList('');
}

/**
 * Renderiza a lista de grupos no modal de "Mover".
 * @param {string} search - O termo de busca.
 */
function renderMoveGroupList(search = '') {
  const listEl = document.getElementById('move-group-list');
  listEl.innerHTML = '';
  const searchKey = canonicalKey(search);

  // 1. Grupos existentes
  const existingGroups = new Set(PROCESSED_DATA.map(g => g.name));
  
  // 2. Aliases existentes (para garantir que grupos-alvo apareçam)
  Object.values(NAME_ALIASES).forEach(name => existingGroups.add(name));

  let groups = Array.from(existingGroups).sort();

  // 3. Filtra pela busca
  if (searchKey) {
    groups = groups.filter(g => canonicalKey(g).includes(searchKey));
  }

  // 4. Adiciona "Criar novo grupo" se a busca não for vazia
  if (search && !groups.includes(search)) {
    groups.unshift(search); // Adiciona no topo
  }

  // 5. Renderiza
  groups.forEach(groupName => {
    const item = document.createElement('div');
    item.className = 'group-item';
    item.textContent = groupName;
    item.addEventListener('click', () => {
      // Destaca o item selecionado
      document.querySelectorAll('#move-group-list .group-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      // Opcional: confirmar direto no clique? Não, melhor ter botão "Confirmar"
    });
    listEl.appendChild(item);
  });
}

/**
 * Confirma a movimentação de transações.
 */
function handleConfirmMove() {
  const selectedEl = document.querySelector('#move-group-list .group-item.selected');
  const targetGroup = selectedEl ? selectedEl.textContent : document.getElementById('move-group-search').value;
  const saveAlias = document.getElementById('saveAliasCheckbox').checked;
  
  if (!targetGroup) {
    showNotification('Nenhum grupo de destino selecionado.', 'error');
    return;
  }
  
  if (saveAlias) {
    let count = 0;
    currentMoveContext.rawHists.forEach(hist => {
      const key = canonicalKey(hist);
      if (key && !NAME_ALIASES[key]) { // Só adiciona se não houver alias
        NAME_ALIASES[key] = targetGroup;
        count++;
      } else if (key && NAME_ALIASES[key]) {
        // Se já existe, atualiza
        NAME_ALIASES[key] = targetGroup;
        count++;
      }
    });
    
    document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
    saveAliasesToStorage();
    showNotification(`${count} aliases salvos. Reprocessando...`, 'success');
  } else {
    showNotification('Movimentação (sem salvar alias) ainda não implementada. Salve como alias.', 'warning');
    // Nota: Mover sem alias exigiria alterar o RAW_DATA, o que é complexo.
    // A lógica de alias é a correta.
  }
  
  toggleModal('moveTransactionModal', false);
  fullReRender();
}

/**
 * Abre o modal "Editor de Aliases".
 */
function openAliasEditor() {
  document.getElementById('nameAliasesEditor').value = JSON.stringify(NAME_ALIASES, null, 2);
  toggleModal('aliasEditorModal', true);
}

/**
 * Salva os aliases do editor de texto.
 */
function handleSaveAliases() {
  const editor = document.getElementById('nameAliasesEditor');
  try {
    const newAliases = JSON.parse(editor.value);
    NAME_ALIASES = newAliases;
    saveAliasesToStorage();
    showNotification('Aliases salvos e reprocessados!', 'success');
    toggleModal('aliasEditorModal', false);
    fullReRender();
  } catch (err) {
    console.error(err);
    showNotification('Erro de sintaxe no JSON. Verifique as vírgulas e aspas.', 'error');
  }
}

/**
 * Abre o novo modal de "Resumo".
 */
function openSummaryModal() {
  toggleModal('summaryModal', true);
  // Renderiza o gráfico APÓS o modal estar visível
  // Usar setTimeout(0) garante que o DOM atualizou
  setTimeout(() => {
    renderSummaryModal();
  }, 0);
}


/* ======================================================================== */
/* FUNÇÕES AUXILIARES (Notificação, localStorage)     */
/* ======================================================================== */

/**
 * Mostra a barra de notificação (substitui alert()).
 * @param {string} message - A mensagem a exibir.
 * @param {string} type - 'success', 'error', 'warning' (default).
 */
let notificationTimeout;
function showNotification(message, type = 'default') {
  const bar = document.getElementById('notification-bar');
  if (!bar) {
    console.warn("Elemento #notification-bar não encontrado. Usando console.log:", message);
    return;
  }
  
  // Limpa timeout anterior
  clearTimeout(notificationTimeout);

  bar.textContent = message;
  bar.className = 'show'; // Reseta classes
  
  if (type === 'success') bar.classList.add('success');
  else if (type === 'error') bar.classList.add('error');
  else if (type === 'warning') bar.classList.add('warning');

  // Esconde após 4 segundos
  notificationTimeout = setTimeout(() => {
    bar.classList.remove('show');
  }, 4000);
}

/**
 * Controla a visibilidade dos modais.
 * @param {string} modalId - O ID do modal overlay.
 * @param {boolean} show - True para mostrar, false para esconder.
 */
function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  if (show) {
    modal.classList.add('active');
  } else {
    modal.classList.remove('active');
  }
}

/**
 * Obtém as cores corretas para os gráficos com base no tema.
 * @returns {object} - Objeto com cores (text, grid, line, etc.).
 */
function getChartColors() {
  const style = getComputedStyle(document.body);
  return {
    text: style.getPropertyValue('--text').trim(),
    grid: style.getPropertyValue('--chart-grid').trim(),
    line: style.getPropertyValue('--chart-line').trim(),
    green: style.getPropertyValue('--green').trim(),
    red: style.getPropertyValue('--red').trim(),
    orange: style.getPropertyValue('--orange').trim(),
    cyan: style.getPropertyValue('--cyan').trim(),
    muted: style.getPropertyValue('--muted').trim(),
    card: style.getPropertyValue('--card').trim(),
    accent: style.getPropertyValue('--accent').trim(),
  };
}

/* ======================================================================== */
/* INICIALIZAÇÃO E PERSISTÊNCIA (localStorage)        */
/* ======================================================================== */

const STORAGE_KEY_ALIASES = 'fin_v5_aliases';
const STORAGE_KEY_FILTERS = 'fin_v5_filters';
const STORAGE_KEY_THEME = 'fin_v5_theme';

/**
 * Salva os aliases no localStorage.
 */
function saveAliasesToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY_ALIASES, JSON.stringify(NAME_ALIASES));
  } catch (err) {
    console.error("Erro ao salvar aliases no localStorage:", err);
    showNotification("Erro ao salvar aliases (localStorage cheio?)", 'error');
  }
}

/**
 * Carrega os aliases do localStorage ou usa o padrão.
 */
function loadAliases() {
  try {
    const storedAliases = localStorage.getItem(STORAGE_KEY_ALIASES);
    if (storedAliases) {
      const parsed = JSON.parse(storedAliases);
      // Funde os padrões com os salvos (dando prioridade aos salvos)
      NAME_ALIASES = { ...DEFAULT_ALIASES, ...parsed };
    } else {
      NAME_ALIASES = { ...DEFAULT_ALIASES };
    }
  } catch (err) {
    console.error("Erro ao carregar aliases:", err);
    NAME_ALIASES = { ...DEFAULT_ALIASES };
  }
}

/**
 * Salva os filtros atuais no localStorage.
 */
function saveFilters() {
  try {
    const filtersToSave = {
      ...FILTERS,
      years: CURRENT_YEARS,
      sort: CURRENT_SORT
    };
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(filtersToSave));
  } catch (err)
...
[long file content truncated]
...
  }
}

/**
 * Inicializa o tema (claro/escuro).
 */
function initTheme() {
  const theme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
  const themeIcon = document.getElementById('themeToggle').querySelector('use');
  
  if (theme === 'light') {
    document.body.classList.add('light');
    themeIcon.setAttribute('href', '#icon-moon');
  } else {
    document.body.classList.remove('light'); // Garante que dark é o padrão
    themeIcon.setAttribute('href', '#icon-sun');
  }
  
  // Corrige o bug do "initTheme is not defined"
  // Esta função agora existe e é chamada no DOMContentLoaded.
}

// ========================================================================
//               *** INÍCIO DA CORREÇÃO (PLANO C) ***
// ========================================================================

/**
 * Função principal de inicialização.
 * (Movida para ser chamada pelo initializeApp)
 */
function main() {
  // Garante que os elementos DOM existem antes de anexar eventos
  setupEventListeners();
  
  // Carrega estado salvo
  initTheme();
  loadAliases();
  loadFilters();
  
  // Renderiza o estado inicial (vazio ou com dados carregados, se houver)
  updateAll();
  
  showNotification('Aplicativo pronto. Carregue um CSV para começar.', 'success');
}

/**
 * NOVO: Verificador de inicialização (Plano C)
 * Espera as bibliotecas externas (Heatmap) carregarem antes de rodar o main.
 */
function initializeApp() {
  // Procura pela função/classe que a biblioteca do heatmap define
  // **** CORREÇÃO (PLANO D): Espera o D3 E o CalendarHeatmap ****
  if (typeof d3 !== 'undefined' && typeof CalendarHeatmap !== 'undefined') {
    // A biblioteca carregou!
    console.log('D3 e CalendarHeatmap carregados, iniciando o main()...');
    main();
  } else {
    // Ainda não carregou, tenta de novo em 100ms
    console.warn('Esperando pela biblioteca CalendarHeatmap (tentando de novo em 100ms)...');
    setTimeout(initializeApp, 100);
  }
}

// --- Inicia o aplicativo ---
// **** A CORREÇÃO MAIS IMPORTANTE (Versão "Bala de Prata") ****
// Em vez de 'load' ou 'DOMContentLoaded' direto no main,
// chamamos o nosso verificador quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', initializeApp);