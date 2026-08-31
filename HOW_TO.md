# Guia Prático de Execução (HOW TO)

Guia de referência focado estritamente em como executar comandos, configurar buscas, rodar testes, aplicar filtros e executar pipelines do projeto.

---

## 1. Instalação e Compilação

### Como Instalar as Dependências
```bash
npm install
```

### Como Compilar Todo o Monorepo
```bash
npm run build
```

### Como Compilar Apenas @codeplaydata/datasus-core
```bash
npm run build:core
```

### Como Compilar Apenas @codeplaydata/datasus-linkage
```bash
npm run build:linkage
```

### Como Compilar as Aplicações (`app/`)
```bash
npm run build:app
```

---

## 2. Execução de Testes

### Como Rodar Todos os Testes (Unitários, Integração e E2E)
```bash
npm test
```

### Como Rodar Testes Unitários
```bash
npm run test:unit
```

### Como Rodar Testes Unitários com Cobertura de Código
```bash
npm run test:unit:coverage
```

### Como Rodar um Arquivo Específico de Teste Unitário
```bash
npx tsx --test test/unit/packages/core/Criteria.test.ts
```

### Como Rodar Testes de Integração
```bash
npm run test:integration
```

### Como Rodar Testes de Integração com Cobertura
```bash
npm run test:integration:coverage
```

### Como Rodar Testes End-to-End (E2E)
```bash
npm run test:e2e
```

### Como Rodar um Teste E2E Específico
```bash
npx tsx --test-timeout 120000 --test test/e2e/app/indicators/prison_indicators_eapp.test.ts
```

### Como Rodar Toda a Cobertura Consolidada
```bash
npm run test:coverage
```

---

## 3. Execução dos Pipelines de Ingestão

### Como Executar a Ingestão do SIA (Ambulatorial)
```bash
npm run siasus:main
```

### Como Executar a Ingestão do SIH (Hospitalar)
```bash
npm run sihsus:main
```

### Como Executar a Ingestão do SIM (Mortalidade)
```bash
npm run sim:main
```

### Como Executar a Ingestão do SINAN (Agravos de Notificação)
```bash
npm run sinan:main
```

### Como Executar a Ingestão do SINASC (Nascidos Vivos)
```bash
npm run sinasc:main
```

### Como Executar a Ingestão do CNES (Estabelecimentos de Saúde)
```bash
npm run cnes:main
```

### Como Executar o Linkage do SIA com Outras Bases
```bash
npm run siasus:linkage
```

---

## 4. Como Customizar e Buscar Dados no SIASUS

### Como Alterar Tipo de Arquivo, UF e Período no Subset (`app/siasus/service.ts`)
```typescript
import { SIASubset } from "./src/SIASubset.js";

// Exemplo: buscar arquivos de Produção Ambulatorial (PA) do Rio de Janeiro e São Paulo para 2024
export const subset: SIASubset = {
    src: 'PA', // 'PA', 'BI', 'AQ', 'AR', 'AB', 'AC', 'AD', 'AM', 'AN', etc.
    states: ['RJ', 'SP'],
    period: {
        start: {
            year: 2024,
            month: '01'
        },
        end: {
            year: 2024,
            month: '12'
        }
    }
};
```

### Como Filtrar por Estabelecimento (CNES), CBO ou Procedimento (`app/siasus/service.ts`)
```typescript
import { Criteria, StringCriteria, ArrayCriteria } from "@codeplaydata/datasus-core";

export const criteria = Criteria.set([
    // Filtrar apenas o CNES específico (ex: Sanatório Penal)
    new StringCriteria("2270196", "PA_CODUNI"),
    
    // Ou filtrar por múltiplos CBOs
    new ArrayCriteria(["225125", "225124", "223505"], "CBOPROF"),
    
    // Ou filtrar por lista de procedimentos SIGTAP
    new ArrayCriteria(["0301010072", "0301060061"], "PROC_ID")
]);
```

### Como Configurar Parser e Dicionário de Transformação (`app/siasus/service.ts`)
```typescript
import { SIABasicParser } from "./src/SIABasicParser.js";

export const BIDictionary = new Map<string, (value: any) => any>([
    // Exemplo: anonimizar CNS do paciente gerando hash hex
    ['CNS_PAC', (value: string) => Buffer.from(value).toString("hex")],
    // Exemplo: sanitizar campos numéricos
    ['PA_VALPRO', (value: string) => parseFloat(value.trim()) || 0]
]);

export const parser = SIABasicParser.instanceOf(BIDictionary);
```

### Como Configurar Concorrência e Diretório de Armazenamento (`app/siasus/service.ts`)
```typescript
import { SIASUSService } from "./src/SIASUSService.js";
import { DATA_PATH, MAX_CONCURRENT_PROCESSES } from "../shared/config.js";

export const sia = SIASUSService.init(gateway, {
    filters: criteria.toDTO(),
    concurrency: 6, // Quantidade de processos filhos em paralelo
    dataPath: "./data/siasus", // Diretório local para cache e download de DBC/DBF
    parser: parser,
    verbose: true // Exibe barra de progresso no console
});
```

### Como Customizar o Callback de Persistência (`app/siasus/main.ts`)
```typescript
import { MongoClient } from "mongodb";
import { MONGO_URI } from "../shared/config.js";
import { sia, subset } from "./service.js";

const mongoClient = new MongoClient(MONGO_URI);
await mongoClient.connect();
const db = mongoClient.db("siasus");
const collection = db.collection("producao_ambulatorial_filtrada");

await sia.subset(subset);
await sia.exec(
    async (message: any) => {
        // Ignora mensagens de metadados emitidas no início do arquivo
        if (message.type === 'metadata') return;

        // Inserção no banco ou processamento adicional
        await collection.insertOne(message);
    }
).finally(
    async () => {
        console.log('Ingestão finalizada com sucesso!');
        await mongoClient.close();
        process.exit(0);
    }
);
```

---

## 5. Como Filtrar Documentos Segundo Critérios

### Como Filtrar por Igualdade Estrita com `StringCriteria`
```typescript
import { StringCriteria } from "@codeplaydata/datasus-core";

// Registro é aceito se record['SEXO'] === '2'
const filterSexo = new StringCriteria('2', 'SEXO');
```

### Como Filtrar por Conjunto de Valores com `ArrayCriteria`
```typescript
import { ArrayCriteria } from "@codeplaydata/datasus-core";

// Registro é aceito se record['CODESTAB'] estiver na lista
const filterEstabs = new ArrayCriteria([
    "2270196", // Sanatório Penal
    "6996914", // Frederico Marques
    "4056167"  // Benfica
], "CODESTAB");
```

### Como Combinar Múltiplos Critérios com `CriteriaSet`
```typescript
import { Criteria, StringCriteria, ArrayCriteria } from "@codeplaydata/datasus-core";

// Todos os critérios devem retornar verdadeiro (operação AND)
const criteria = Criteria.set([
    new StringCriteria("RJ", "UF_RESID"),
    new ArrayCriteria(["A150", "A151", "A152", "A153"], "CID_NOTIF")
]);

const jobConfig = {
    filters: criteria.toDTO(),
    dataPath: "./data",
    concurrency: 4
};
```

### Como Filtrar Códigos CID-10 Utilizando o Utilitário `ICD10`
```typescript
import { ICD10 } from "@codeplaydata/datasus-core";

const icds = await ICD10.load();

// Seleciona CIDs do Capítulo X (J00 a J99) e bloco Covid (U07.1 e U07.2)
const respiratoriasECovid = icds.clear().block('J').block('U', { start: '071', end: '072' }).list;

// Seleciona CIDs de Tuberculose (A15 a A19)
const tuberculose = icds.clear().block('A', { start: '15', end: '19' }).list;
```

### Como Aplicar Filtragem de Domínio Complexa no Callback da Aplicação
```typescript
const cleanCode = (code: string) => code ? code.trim().toUpperCase().replace(".", "") : "";

await service.exec(async (message: any) => {
    if (message.type === 'metadata') return;

    const causabas = cleanCode(message.CAUSABAS);
    const linhas = [
        cleanCode(message.LINHAA),
        cleanCode(message.LINHAB),
        cleanCode(message.LINHAC),
        cleanCode(message.LINHAD),
        cleanCode(message.LINHAII)
    ].filter(Boolean);

    const isTarget = respiratoriasECovid.includes(causabas) ||
                     linhas.some(l => tuberculose.includes(l));

    if (isTarget) {
        await collection.insertOne(message);
    }
});
```

---

## 6. Como Executar Vinculação de Registros (Record Linkage)

### Como Configurar e Executar Linkage Determinístico
```typescript
import { LinkageStrategy, InMemoryIndex, InMemoryMatchRepository } from "@codeplaydata/datasus-linkage";

const index = new InMemoryIndex();
const repo = new InMemoryMatchRepository();

const strategy = new LinkageStrategy('SIM-SIA-DETERMINISTIC', index, repo);

strategy
    .cohort(simService, {
        name: 'Obitos 2024',
        subset: { src: 'DO', states: ['RJ'], year: [2024] }
    })
    .link(siaService, {
        name: 'SIA Consultas',
        type: 'deterministic',
        on: { CPF: 'PA_CPF' },
        blocking: { UF: 'PA_UFMUN' }
    });

await strategy.exec();
const matches = await repo.findAll();
console.log(`Matches encontrados: ${matches.length}`);
```

### Como Configurar Linkage Probabilístico (Score Simples e Fellegi-Sunter)
```typescript
import { LinkageStrategy, InMemoryIndex, InMemoryMatchRepository } from "@codeplaydata/datasus-linkage";

const strategy = new LinkageStrategy('SIM-SINAN-PROBABILISTIC', new InMemoryIndex(), new InMemoryMatchRepository());

strategy
    .cohort(simService, {
        name: 'Obitos TB',
        subset: { src: 'DO', states: ['RJ'], year: [2024] }
    })
    .link(sinanService, {
        name: 'Notificacoes TB',
        type: 'probabilistic',
        scoreStrategy: 'fellegi-sunter',
        on: {
            NOME: 'NM_PACIENT',
            DT_NASC: 'DT_NASC',
            NOME_MAE: 'NM_MAE'
        },
        blocking: {
            MUN_RES: 'ID_MN_RESI'
        },
        weights: {
            NOME: { m: 0.95, u: 0.01 },
            DT_NASC: { m: 0.90, u: 0.005 },
            NOME_MAE: { m: 0.85, u: 0.02 }
        },
        threshold: 3.5
    });

await strategy.exec();
```

### Como Utilizar Índice em Disco (`SortMergeIndex`) para Grandes Volumes de Dados
```typescript
import { SortMergeIndex, InMemoryMatchRepository, LinkageStrategy } from "@codeplaydata/datasus-linkage";

// Utiliza indexação externa em disco evitando estouro de memória heap
const diskIndex = new SortMergeIndex("./temp/linkage-index");
const repo = new InMemoryMatchRepository();

const strategy = new LinkageStrategy('BIG-LINKAGE', diskIndex, repo);
// ... configurar cohort e link ...
await strategy.exec();
```

---

## 7. Como Executar Scripts de Indicadores e Utilitários

### Como Executar o Script de Extração de Indicadores de Saúde Prisional e APS
```bash
npx tsx scripts/extract_indicators.ts
```

### Como Executar o Script de Extração de Indicadores com Linkage entre Bases
```bash
npx tsx scripts/extract_linkage_indicators.ts
```

### Como Inspecionar Distribuição de Equipes e Estabelecimentos CNES
```bash
npx tsx scripts/inspect_cnes_distribution.ts
```

### Como Inspecionar Unidades Prisionais Cadastradas no CNES
```bash
npx tsx scripts/inspect_cnes_units.ts
```

### Como Inspecionar Códigos e Descrições de Procedimentos SIGTAP
```bash
npx tsx scripts/inspect_exact_tdo_sigtap.ts
```

### Como Inspecionar Notificações do SINAN
```bash
npx tsx scripts/inspect_sinan_tdo.ts
```

### Como Atualizar o Arquivo de Metadados do CID-10
```bash
npx tsx scripts/update_cid10.ts
```

---

## 8. Como Publicar os Pacotes no NPM

### Como Publicar Todos os Workspaces
```bash
npm run publish
```

### Como Publicar Apenas @codeplaydata/datasus-core
```bash
npm run publish:core
```

### Como Publicar Apenas @codeplaydata/datasus-linkage
```bash
npm run publish:linkage
```
