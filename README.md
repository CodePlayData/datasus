# @codeplaydata/datasus

[![npm version](https://badge.fury.io/js/@codeplaydata%2Fdatasus.svg)](https://www.npmjs.com/package/@codeplaydata/datasus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Monorepo para **ingestão, processamento e vinculação de microdados do DATASUS** (Sistema Único de Saúde do Brasil).

O sistema faz o download de arquivos `.DBC` compactados do FTP do DATASUS, descomprime para `.DBF`, lê registro a registro, aplica filtros, e persiste. Tudo orquestrado por um sistema de jobs com processamento paralelo em processos filhos.

## Visão geral do fluxo

```
FTP DATASUS  →  .DBC  →  .DBF  →  registros (record-by-record)  →  filtros  →  parser  →  persistência
   ↑               ↑        ↑                                    ↑
  Gateway       DbcWriter  dbffile                          Criteria
                DbcReader
```

## Pacotes

### `@codeplaydata/datasus-core`

Biblioteca central que gerencia todo o pipeline de ingestão de dados. Não é apenas descompressão — é um **sistema de orquestração de jobs paralelos**.

**O que faz:**

1. **Gateway FTP** — conecta ao FTP do DATASUS, lista arquivos disponíveis e realiza downloads. Dois padrões de listagem:
   - `DATASUSStatePeriodFTPGateway` — filtra por UF + período (mês/ano), usado por SIA, SIH
   - `DATASUSCountryYearFTPGateway` — filtra por ano (arquivos nacionais), usado por SIM, SINAN

2. **Gerenciamento de arquivos DBC/DBF** — `DbcReader` descomprime `.DBC` → `.DBF` e itera registro a registro. `DbcWriter` faz o inverso: acumula registros em buffer, escreve em `.DBF` por batch (2000 registros), e recompacta para `.DBC`.

3. **Orquestração de jobs** — o coração do pacote:
   - `JobOrchestrator` — entry point. Recebe um Gateway e um Subset, lista arquivos, divide em chunks, baixa tudo, e dispara os jobs em paralelo
   - `JobScheduler` — agendamento de chunks. Para cada chunk de arquivos, dispara `JobRunner` para cada arquivo via `child_process.fork()`
   - `JobRunner` — gerencia processos filhos. Forca `job.js`, envia `JobMessage` (arquivo, filtros, parser, dataPath), e recebe de volta: progresso (percentual), metadados (campos do DBF), e os registros filtrados
   - `JobProcessor` — roda no processo filho. Abre o `.DBC` via `DbcReader`, itera registro a registro, aplica os `Criteria`, e emite para o processo pai via IPC
   - `SplitIntoChunks` — divide a lista de arquivos em batches conforme o nível de concorrência configurado

4. **Filtragem** — sistema de `Criteria` para filtrar registros durante a leitura:
    - `StringCriteria` — campo deve ser igual a um valor
    - `ArrayCriteria` — campo deve estar em um array de valores
    - `CriteriaSet` — combina múltiplos critérios (todos devem passar)

    ```typescript
    filters: [
        { type: 'string', prop: 'SEXO', value: '2' },
        { type: 'array', prop: 'CGES', value: ['01', '02', '03'] },
    ]
    ```

5. **Parser** — interface `Parser<Records>` para transformar registros antes de emití-los, com dicionário de funções por campo.

**Configuração de jobs (`JobConfig`):**

| Propriedade | Descrição |
|-------------|-----------|
| `dataPath` | Caminho local para salvar/baixar arquivos |
| `concurrency` | Número máximo de processos filhos em paralelo |
| `verbose` | Exibir progresso e resumo no console |
| `filters` | Array de `CriteriaObject` para filtragem |
| `parser` | Parser opcional para transformar registros |
| `jobScript` | Script customizado do worker (default: `job.js` do próprio pacote) |

### `@codeplaydata/datasus-linkage`

Biblioteca para **vinculação de registros** (record linkage) entre dois conjuntos de dados do SUS. Implementa blocagem (blocking) e comparação determinística ou probabilística.

**Como funciona:**

1. Define uma **coorte** (conjunto base de registros, ex: óbitos do SIM)
2. Indexa os registros da coorte por **chaves de blocagem** (ex: CPF, data de nascimento)
3. Para cada registro do **conjunto alvo** (ex: ambulatoriais do SIA), busca candidatos pela mesma blocagem
4. Compara candidatos usando a estratégia configurada:
   - **Determinística** — match se os campos de blocagem coincidirem
   - **Probabilística (simple)** — pontuação ponderada por campo, com threshold
   - **Probabilística (Fellegi-Sunter)** — pesos m/u (agree/disagree) com log likelihood ratio

**Interfaces:**

| Interface | Descrição |
|-----------|-----------|
| `IndexStrategy` | Armazena e recupera registros por chave (implementações: in-memory, persistência externa) |
| `MatchRepository` | Persiste os matches encontrados (implementações: in-memory, persistência externa) |

**Configuração (`LinkageConfig`):**

| Propriedade | Descrição |
|-------------|-----------|
| `name` | Nome do step de linkage |
| `type` | `deterministic` ou `probabilistic` |
| `scoreStrategy` | `simple` ou `fellegi-sunter` (apenas probabilístico) |
| `on` | Mapeamento campo-coorte → campo-alvo para comparação |
| `blocking` | Mapeamento de campos para blocagem (reduz espaço de busca) |
| `weights` | Pesos por campo (número simples ou objeto `{m, u}` / `{agreement, disagreement}`) |
| `threshold` | Limite mínimo para considerar match |

### Exemplo de uso

```typescript
// Ingestão com core
const orchestrator = JobOrchestrator.init(gateway, {
    concurrency: 4,
    verbose: true,
    dataPath: './data',
    filters: [{ type: 'string', prop: 'SEXO', value: '2' }],
    parser: myParser,
});

await orchestrator.subset(mySubset);
await orchestrator.exec(async (record) => {
    await persist(record);
});

// Linkage entre bases
const strategy = new LinkageStrategy('SIM-SIA', indexStrategy, matchRepository);

strategy
    .cohort(simService, { name: 'Obitos 2024', subset: simSubset })
    .link(siaService, {
        name: 'SIA Match',
        type: 'probabilistic',
        scoreStrategy: 'fellegi-sunter',
        on: { NOME: 'NOME_PACIENTE', DT_NASC: 'DT_NASCTO' },
        blocking: { UF: 'UF_RES' },
        weights: { NOME: { m: 0.95, u: 0.05 }, DT_NASC: 3 },
        threshold: 2,
    });

await strategy.exec();
```

## Aplicações

Cada pasta em `app/` é um pipeline independente para um sistema de informação do SUS. Cada uma define seu próprio Gateway (FTP), Subset, Parser e Service, e usa o `JobOrchestrator` do core para rodar a ingestão.

| Sistema | Caminho | Gateway | Descrição |
|---------|---------|---------|-----------|
| **SIA** | `app/siasus/` | State+Period | Sistema de Informações Ambulatoriais |
| **SIH** | `app/sihsus/` | State+Period | Sistema de Informações Hospitalares |
| **SIM** | `app/sim/` | Country+Year | Sistema de Informações sobre Mortalidade |
| **SINAN** | `app/sinan/` | Country+Year | Agravos de Notificação (ex: tuberculose) |
| **CNES** | `app/cnes/` | — | Cadastro Nacional de Estabelecimentos de Saúde |

**Exemplo — pipeline SIASUS:**

```typescript
// service.ts — montagem do orchestrator
import { SIASUSService } from "./src/SIASUSService.js";
import { SIAFTPGateway } from "./src/SIAFTPGateway.js";
import { SIABasicParser } from "./src/SIABasicParser.js";
import { BasicFTPClient, Criteria, ArrayCriteria } from "@codeplaydata/datasus-core";

const ftpClient = await BasicFTPClient.connect('ftp.datasus.gov.br');
const gateway = await SIAFTPGateway.getInstanceOf(ftpClient);

const criteria = Criteria.set([
    new ArrayCriteria(['223', '225', '321'], 'CBOPROF'),
]);

const parser = SIABasicParser.instanceOf(new Map([
    ['CNS_PAC', (v: string) => Buffer.from(v).toString("hex")]
]));

const subset = {
    src: 'BI' as const,
    states: ['RJ'],
    period: {
        start: { year: 2008, month: '01' },
        end: { year: 2026, month: '03' },
    },
};

const jobConfig = {
    filters: criteria.toDTO(),
    concurrency: 6,
    dataPath: "./data/sia",
    parser,
};

const sia = SIASUSService.init(gateway, jobConfig);

// main.ts — execução
await sia.subset(subset);
await sia.exec(async (message) => {
    if (message.type !== 'metadata') {
        await persist(message);
    }
});
```

## Instalação

```bash
npm install
```

## Build

```bash
npm run build           # Compila todos os pacotes e aplicações
npm run build:core      # Apenas @codeplaydata/datasus-core
npm run build:linkage   # Apenas @codeplaydata/datasus-linkage
npm run build:app       # Compila as aplicações (app/)
```

## Executar pipelines

```bash
npm run siasus:main      # Ingestão SIA
npm run siasus:linkage   # Linkage SIA com outra base
npm run sinan:main       # Ingestão SINAN
```

Os pipelines rodam com `--max-old-space-size=4096` para lidar com volumes grandes de dados.

## Testes

Bateria de testes organizada em três camadas:

```bash
npm run test             # Executa tudo: unit → integration → e2e
npm run test:unit        # Testes unitários (isolados, sem I/O)
npm run test:integration # Testes de integração (I/O, fixtures, DBF real)
npm run test:e2e         # Testes end-to-end (pipelines completos, timeout 120s)
```

**Cobertura:**

- **core** — FTP gateway (state+period, country+year), leitura/escrita DBC, orquestração/scheduling/execução de jobs, filtros (Criteria), chunking, persistência
- **linkage** — estratégias de match (deterministic, simple, Fellegi-Sunter), índices in-memory e persistência externa, repositório de matches, DbcRecordProvider

## Publicação

```bash
npm run publish           # Publica todos os pacotes no npm
npm run publish:core      # Apenas @codeplaydata/datasus-core
npm run publish:linkage   # Apenas @codeplaydata/datasus-linkage
```

## Dependências externas

| Pacote | Função |
|--------|--------|
| [`@codeplaydata/dbc2dbf`](https://www.npmjs.com/package/@codeplaydata/dbc2dbf) | Conversão `.DBC` ↔ `.DBF` |
| [`basic-ftp`](https://www.npmjs.com/package/basic-ftp) | Cliente FTP para conectar ao DATASUS |
| [`dbffile`](https://www.npmjs.com/package/dbffile) | Leitura e escrita de arquivos DBF |
| [`mongodb`](https://www.npmjs.com/package/mongodb) | Persistência de registros |

## Licença

[Apache 2.0](LICENSE) — Pedro Paulo dos Santos (dr2p)
