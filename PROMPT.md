# PROMPT
Resolver continuamente os itens técnicos catalogados no [fixtures.md](fixtures.md).

---

## Regras

1. **Separação Arquitetural de Camadas:**
   - O pacote `@codeplaydata/datasus-core` deve permanecer genérico, agnóstico e sem acoplamento com regras de negócio ou lógicas regionais específicas do SUS.
   - O pacote `@codeplaydata/datasus-linkage` deve conter exclusivamente a infraestrutura de blocagem, indexação e cálculo de linkage (determinístico/probabilístico).
   - As aplicações dentro de `app/` (`siasus`, `sihsus`, `sim`, `sinan`, `sinasc`, `cnes`) encapsulam as configurações de gateway, subsets, critérios e persistência específicas de cada sistema.

2. **Tipagem Estrita e Qualidade de Código:**
   - Todo código novo ou refatorado deve ser estritamente tipado em TypeScript.
   - Evitar o uso de `any` desnecessário; preferir interfaces, types ou generics com restrições explícitas.
   - Respeitar a tipagem e os contratos das interfaces centrais (`Subset`, `FTPGateway`, `Criteria`, `Parser`, `IndexStrategy`, `MatchRepository`).
   - não use `types.ts`, se o tipo for usado por mais de um lugar crie ele em arquivo separado, caso contrário, mantenha no mesmo arquivo da única classe que o usará. 

3. **Integridade de Testes e Suíte de Validação:**
   - Nenhuma alteração deve quebrar os testes existentes.
   - Sempre executar e garantir a aprovação de:
     - Testes unitários (`npm run test:unit`)
     - Testes de integração (`npm run test:integration`)
     - Testes end-to-end (`npm run test:e2e`)

4. **Gerenciamento de Recursos e Memória:**
   - Ao rodar scripts e pipelines que realizam leitura de múltiplos arquivos DBC/DBF em lotes, utilizar a flag de memória `--max-old-space-size=4096`.
   - Fechar conexões ativas (como instâncias de MongoDB e clientes FTP) nos blocos `finally` ou métodos de encerramento.

5. **Modificações Cirúrgicas e Documentação:**
   - Não alterar códigos, formatos ou arquivos que não façam parte do escopo da solicitação.
   - Manter a documentação em [README.md](README.md), [HOW_TO.md](HOW_TO.md) e [fixtures.md](fixtures.md) sincronizada com as mudanças da base de código.

6. **Pressupostos**
   - Não presuma nada! Sempre pergunte em caso de dúvidas.
   - As decisões de projeto devem ser tomadas por mim (o usuário) não você.

---

## Preferências

1. **Padrão de Módulos e Compilação:**
   - Utilizar ESM puro (`"type": "module"` no `package.json`).
   - **Em imports relativos TypeScript, incluir sempre a extensão `.js` (ex.: `import { config } from "./config.js"`).**

2. **Ferramental de Testes:**
   - Utilizar o test runner nativo do Node.js (`node:test` e `node:assert/strict`) executado com suporte TypeScript via `tsx`.

3. **Padrões de Projeto (Design Patterns):**
   - **Strategy Pattern** para estratégias de nomenclatura e particionamento FTP (`StatePeriodStrategy`, `CountryYearStrategy`, `StateYearStrategy`).
   - **Composite / Specification Pattern** para montagem e serialização de filtros com `CriteriaSet`.
   - **Worker Pool / IPC** para descompressão e filtragem concorrente de arquivos via `JobOrchestrator` e subprocessos `child_process`.
   - **Record Linkage** probabilístico com o modelo de log-likelihood ratio de Fellegi-Sunter e técnicas de blocagem para otimização de busca.

4. **Organização de Domínio:**
   - Manter dicionários de códigos, tabelas auxiliares (CBO, SIGTAP, CNES, CID-10) e tipos de registros dentro de subpastas `utils/` correspondentes em cada aplicação (`app/<sistema>/utils/`).
   - Centralizar lógicas de cálculo de indicadores de saúde no módulo compartilhado `app/shared/indicators/`.
   - A pasta /package é outro domínio diferente da /app, não misture! /package fornece a base estrutural, focado em permitir que devs usem os pacotes sem usar as aplicações. A pasta /app são as aplicações com suas particularidades.

5. **Nomenclatura e Idioma:**
   - Nomes de classes, métodos, interfaces e propriedades da infraestrutura e core em inglês.
   - Nomes de campos de layouts do DATASUS preservados conforme documentação oficial (`CAUSABAS`, `PA_CODUNI`, `CODESTAB`, `CBOPROF`, `PROC_ID`, etc.).
   - describe() e it() em português.

6. **Dúvidas de como usar**
   - Caso não saiba como rodar ou configurar alguma coisa procure o ./HOW_TO.md
   - Na ausência de informação como utilizar, PERGUNTE!

7. **Layout de Código**
   - Após os `imports {}` dê 1 espaço
   - Para os types que podem ter mais de um formato e usem `|` como separador, mantenha alinhado!
   - Não crie `const` apenas para guardar string de parâmetros, prefira inserir eles direto onde se deve.
   - Caso haja necessidade de `const` seguidas mantenha um exatamente embaixo da outra sem espaço entre elas.
   - Todo arquivo deve começar com `// @filename:` e o nome do arquivo com a extensão .ts. Em seguida deve estar copiado a parte resumida da licença com meu nome e o ano atual


8. **fixtures.md**
   - Só marque como feito após a tarefa ter sido concluída.
   - Só considere concluída se todos os testes passarem.
   - Preencha **Relatório após conclusão:** com todas as informações relevantes.
   - Relate as Limitações encontradas e como as contornou.
   - Caso o tópico tenha vindo de algum "//TODO:" delete após concluir a tarefa.

---
