# TODO: Implementação do Indicador de Mortalidade por Tuberculose em PPL (SIM)

Este arquivo serve como guia completo de requisitos e exemplos de código para prosseguir com a implementação do indicador a partir de outro computador.

---

## 📋 Contextualização do Indicador

* **Título:** Mortalidade por tuberculose por 100.000 pessoas privadas de liberdade (PPL).
* **Objetivo:** Mensurar a taxa de mortalidade por tuberculose nas PPL e monitorar tendências.
* **Ano de Referência:** 2024
* **Meta:** 5 mortes por 100.000 PPL.

---

## 🔍 Regras de Filtro e Inclusão

### 1. Critério de Inclusão de Unidades (CODESTAB)
Filtrar apenas Declarações de Óbito (DO) geradas pelos seguintes CNES:
1. **2270196** (Sanatório Penal)
2. **6996914** (Frederico Marques – Porta de entrada)
3. **4056167** (Unidades Prisionais de São Cristóvão / Benfica)
4. **4056310** (UP de Bangu)
5. **4056221** (UP de Água Santa)

### 2. Critério de Identificação de Doenças (CIDs)
Selecionar registros onde:
* **CAUSABAS** contenha:
  * CID do Capítulo X (`J00` – `J99`)
  * CID `U07.1` ou `U07.2`
* **OU** qualquer uma das linhas (**LINHAA, LINHAB, LINHAC, LINHAD, LINHAII**) contenha:
  * CID `A15` – `A19`
  * CID do Capítulo X (`J00` – `J99`)
  * CID `U07.1` ou `U07.2`

---

## 🛠️ Arquitetura de Implementação Proposta (Design Alinhado)

Para manter o pacote `@codeplaydata/datasus-core` limpo e genérico, decidimos usar:
1. **Filtro Primário (Core):** Usar o `ArrayCriteria` nativo da Core para filtrar os CNES no worker em paralelo.
2. **Filtro de Domínio (App):** Aplicar o mapeamento complexo de CIDs no callback do script principal (`app/sim/main.ts`).

---

## 💻 Sugestão de Código

### A) Configuração do Filtro de CNES (`app/sim/service.ts`)
```typescript
import { Criteria, ArrayCriteria, BasicFTPClient, DATASUSFTPGateway, StateYearStrategy } from "@codeplaydata/datasus-core";

// ... conexão FTP e gateway ...

export const criteria = Criteria.set([
    new ArrayCriteria([
        "2270196", // Sanatório Penal
        "6996914", // Frederico Marques
        "4056167", // São Cristóvão / Benfica
        "4056310", // UP de Bangu
        "4056221"  // UP de Água Santa
    ], "CODESTAB")
]);

export const subset: SIMSubset = {
   src: 'DO',
   states: ['RJ'],
   year: [2024]
}

// ... inicialização do sia ...
```

### B) Filtragem de Doença no Callback (`app/sim/main.ts`)
```typescript
import { MongoClient } from "mongodb";
import { sia, subset } from "./service.js";

// ... conexões mongodb ...

const matchCausabas = (cid?: string): boolean => {
    if (!cid) return false;
    const clean = cid.trim().toUpperCase().replace(".", "");
    return clean.startsWith("J") || clean === "U071" || clean === "U072";
};

const matchLinhas = (cid?: string): boolean => {
    if (!cid) return false;
    const clean = cid.trim().toUpperCase().replace(".", "");
    const isA15_A19 = clean.startsWith("A15") || clean.startsWith("A16") || 
                      clean.startsWith("A17") || clean.startsWith("A18") || 
                      clean.startsWith("A19");
    return isA15_A19 || matchCausabas(cid);
};

await sia.subset(subset);
await sia.exec(
    async (message: any) => {
        if (message.type === 'metadata') return;

        const causabasMatch = matchCausabas(message.CAUSABAS);
        const linhasMatch = [
            message.LINHAA, 
            message.LINHAB, 
            message.LINHAC, 
            message.LINHAD, 
            message.LINHAII
        ].some(linha => matchLinhas(linha));

        // Persiste apenas se for de interesse da vigilância de Tuberculose/pulmonares
        if (causabasMatch || linhasMatch) {
            await collection.insertOne(message);
        }
    }
).finally(
    async () => {
        console.log('Done!');
        await mongoClient.close();
        process.exit(0);
    }
);
```

---

## 🚀 Como Executar
1. Instale as dependências: `npm install`
2. Compile a aplicação: `npm run build:app`
3. Execute o script principal do SIM: `npm run sim:main`
