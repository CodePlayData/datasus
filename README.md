# @codeplaydata/datasus

[![npm version](https://badge.fury.io/js/@codeplaydata%2Fdatasus.svg)](https://www.npmjs.com/package/@codeplaydata/datasus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Monorepo TypeScript de alta performance para **ingestão, processamento paralelo, filtragem, vinculação de registros (record linkage) e cálculo de indicadores de saúde pública** a partir dos microdados abertos do **DATASUS** (Sistema Único de Saúde do Brasil).

O ecossistema realiza o download automatizado de arquivos `.DBC` compactados diretamente do servidor FTP do Ministério da Saúde, descomprime para `.DBF`, executa leitura registro a registro via workers paralelos (`child_process`), aplica critérios avançados de filtragem e sanitização, transforma os dados via parsers customizáveis, calcula indicadores de saúde pública e possibilita o relacionamento probabilístico entre diferentes sistemas de informação em saúde.

> [!TIP]
> Para exemplos diretos de código e comandos de execução, consulte o [HOW_TO.md](HOW_TO.md).

---

## Sumário

- [Visão Geral do Fluxo](#visão-geral-do-fluxo)
- [Estrutura do Monorepo](#estrutura-do-monorepo)
  - [@codeplaydata/datasus-core](#codeplaydatadatasus-core)
  - [@codeplaydata/datasus-linkage](#codeplaydatadatasus-linkage)
- [Aplicações e Sistemas Suportados](#aplicações-e-sistemas-suportados)
- [Motor de Indicadores de Saúde Pública](#motor-de-indicadores-de-saúde-pública)
- [Guia de Execução (HOW TO)](#guia-de-execução-how-to)
- [Dependências Externas](#dependências-externas)
- [Licença](#licença)

---

## Visão Geral do Fluxo

```
FTP DATASUS  →  .DBC  →  .DBF  →  Registros (Stream)  →  Filtros (Criteria)  →  Parser  →  Persistência / Linkage / Indicadores
    ↑               ↑        ↑                                  ↑
 Gateway FTP    DbcWriter  dbffile                        String/Array
 (Strategies)   DbcReader                              (Worker Paralelo)
```

---

## Estrutura do Monorepo

### `@codeplaydata/datasus-core`

O núcleo da plataforma. Gerencia todo o pipeline de ingestão e orquestração de processamento paralelo distribuído entre múltiplos núcleos de CPU.

- **Gateways FTP com Estratégias Pluggáveis e Plugins Interceptores:**
  - `StatePeriodStrategy`: Particionamento por UF e Período (mês/ano) — utilizado por SIA, SIH e CNES.
  - `CountryYearStrategy`: Particionamento por Ano em âmbito nacional — utilizado por SINAN.
  - `StateYearStrategy`: Particionamento por UF e Ano — utilizado por SIM e SINASC.
  - `FTPGatewayPlugin` / `SubdirectoryPathPlugin`: Interceptação extensível de caminhos remotos para diretórios hierárquicos e subpastas no FTP (utilizado por CNES).
- **Motor DBC / DBF:**
  - `DbcReader`: Descompressão de `.DBC` para `.DBF` e streaming registro a registro.
  - `DbcWriter`: Agrupamento em buffer, escrita em lote em `.DBF` e recompactação para `.DBC`.
- **Orquestrador de Jobs Concorrentes:**
  - `JobOrchestrator`: Ponto de entrada de alto nível. Lista arquivos remotos, particiona em chunks e coordena a execução.
  - `JobScheduler`: Agenda e despacha chunks de arquivos para subprocessos (`child_process.fork`).
  - `JobRunner`: Gerencia o ciclo de vida dos processos filhos e comunica via IPC (progresso, metadados e registros).
  - `JobProcessor`: Executado no processo filho. Descomprime, itera e aplica os filtros antes de transferir dados ao processo pai.
- **Sistema de Filtragem Declarativa (`Criteria`):**
  - `StringCriteria`: Validação por igualdade estrita de string.
  - `ArrayCriteria`: Validação de pertinência em conjunto de valores (`includes`).
  - `CriteriaSet`: Combinação lógica (AND) de múltiplos critérios de seleção.
- **Tabelas de Referência e Metadados:**
  - `ICD10`: Utilitário para manipulação, seleção por blocos/capítulos e validação de códigos da CID-10.

---

### `@codeplaydata/datasus-linkage`

Biblioteca especializada em **vinculação de registros (record linkage)** entre diferentes bases de dados do SUS (ex: cruzar mortalidade do SIM com notificações do SINAN ou consultas ambulatoriais do SIA).

- **Estratégias de Comparação:**
  - **Determinística:** Correspondência exata por campos-chave (ex: CPF, CNS).
  - **Probabilística Simples:** Pontuação ponderada com pesos customizados por campo e limiar (threshold).
  - **Probabilística de Fellegi-Sunter:** Modelo formal de razão de verossimilhança com probabilidades de concordância (\(m\)) e discordância (\(u\)).
- **Técnicas de Blocagem (Blocking):**
  - Redução drástica do espaço cartesiano de comparação indexando registros por blocos (ex: UF de residência, município, ano de nascimento, fonética).
- **Estratégias de Indexação:**
  - `InMemoryIndex`: Indexação em memória RAM rápida para volumes moderados.
  - `SortMergeIndex`: Indexação externa baseada em arquivos temporários em disco para grandes volumes.
  - `InMemoryMatchRepository`: Repositório de armazenamento e consulta dos pares vinculados.

---

## Aplicações e Sistemas Suportados

Dentro do diretório `app/`, cada módulo representa uma integração completa para um sistema do DATASUS:

| Sistema | Diretório | Estratégia de Particionamento | Descrição |
|---------|-----------|-------------------------------|-----------|
| **SIA** | `app/siasus/` | `StatePeriodStrategy` | Sistema de Informações Ambulatoriais (Produção Ambulatorial `PA`, Boletim de Produção Ambulatorial `BI`, APACs, etc.) |
| **SIH** | `app/sihsus/` | `StatePeriodStrategy` | Sistema de Informações Hospitalares (Autorizações de Internação Hospitalar - AIH `RD`) |
| **SIM** | `app/sim/` | `StateYearStrategy` | Sistema de Informações sobre Mortalidade (Declarações de Óbito `DO`) |
| **SINAN** | `app/sinan/` | `CountryYearStrategy` | Sistema de Informação de Agravos de Notificação (Tuberculose `TBRBR`, Dengue `DENGBR`, etc.) |
| **SINASC** | `app/sinasc/` | `StateYearStrategy` | Sistema de Informações sobre Nascidos Vivos (Declarações de Nascido Vivo `DN`) |
| **CNES** | `app/cnes/` | `StatePeriodStrategy` | Cadastro Nacional de Estabelecimentos de Saúde (Leitos `LT`, Serviços `ST`, Estabelecimentos `DC`, Equipes `EQ`) |

---

## Motor de Indicadores de Saúde Pública

Localizado em `app/shared/indicators/`, o repositório contém uma suíte de cálculo de indicadores de saúde pública:

- **Atenção Primária à Saúde - APS (C1 a C7):** Proporção de consultas de pré-natal, exames citopatológicos, vacinação, hipertensão, diabetes, entre outros.
- **Equipes de Saúde Bucal - eSB (B1 a B6):** Primeira consulta odontológica programática, procedimentos preventivos, tratamentos concluídos e cobertura populacional.
- **Equipes de Atenção Primária Prisional - eAPP (P1 a P6):** Cobertura e acompanhamento de saúde da Pessoa Privada de Liberdade (PPL), rastreamento e tratamento de tuberculose no sistema prisional.
- **Consultório na Rua - eCR (CR1 a CR4):** Acompanhamento integral da população em situação de rua, busca ativa e adesão a tratamentos.
- **Equipes Multiprofissionais - eMulti (M1 a M2):** Ações integradas de matriciamento e atendimentos compartilhados na APS.

---

## Guia de Execução (HOW TO)

Consulte o [HOW_TO.md](HOW_TO.md) para obter instruções detalhadas e trechos de código prontos para execução:

| Tópico | Seção no HOW_TO.md |
|--------|-------------------|
| Instalar dependências e compilar pacotes | [1. Instalação e Compilação](HOW_TO.md#1-instalação-e-compilação) |
| Executar testes unitários, integração, e2e e cobertura | [2. Execução de Testes](HOW_TO.md#2-execução-de-testes) |
| Executar pipelines dos sistemas (SIA, SIH, SIM, SINAN, SINASC, CNES) | [3. Execução dos Pipelines de Ingestão](HOW_TO.md#3-execução-dos-pipelines-de-ingestão) |
| Customizar parâmetros, subsets, critérios e persistência do SIASUS | [4. Como Customizar e Buscar Dados no SIASUS](HOW_TO.md#4-como-customizar-e-buscar-dados-no-siasus) |
| Filtrar documentos com `StringCriteria`, `ArrayCriteria` e `ICD10` | [5. Como Filtrar Documentos Segundo Critérios](HOW_TO.md#5-como-filtrar-documentos-segundo-critérios) |
| Configurar e rodar vinculação de bases (Record Linkage) | [6. Como Executar Vinculação de Registros (Record Linkage)](HOW_TO.md#6-como-executar-vinculação-de-registros-record-linkage) |
| Executar scripts utilitários e extração de indicadores | [7. Como Executar Scripts de Indicadores e Utilitários](HOW_TO.md#7-como-executar-scripts-de-indicadores-e-utilitários) |
| Publicar pacotes no registro NPM | [8. Como Publicar os Pacotes no NPM](HOW_TO.md#8-como-publicar-os-pacotes-no-npm) |

---

## Dependências Externas

| Pacote | Função no Projeto |
|--------|-------------------|
| [`@codeplaydata/dbc2dbf`](https://www.npmjs.com/package/@codeplaydata/dbc2dbf) | Descompressão e recompressão de arquivos `.DBC` proprietários do DATASUS |
| [`basic-ftp`](https://www.npmjs.com/package/basic-ftp) | Conexão de alto desempenho e streaming seguro com o FTP público do DATASUS |
| [`dbffile`](https://www.npmjs.com/package/dbffile) | Leitura e escrita otimizada registro a registro de arquivos xBase `.DBF` |
| [`mongodb`](https://www.npmjs.com/package/mongodb) | Driver oficial para persistência dos documentos filtrados e consolidados |
| [`tsx`](https://www.npmjs.com/package/tsx) | Execução TypeScript com suporte nativo a ESM e runner de testes |

---

## Licença

Distribuído sob a licença [Apache 2.0](LICENSE).  
Copyright (c) 2025-2026 Pedro Paulo Teixeira dos Santos ([@dr2pedro](https://github.com/dr2pedro)).
