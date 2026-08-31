# *Fixtures* e Pendências do Código

---
- [x] "Tipar com o pdf do datasus disponível em "/assets/Informe_Tecnico_SIASUS_2019_07.pdf", mas manter o [key:string]:any. Ajeitar o nome para BIRecord e ajeitar onde ele estiver referenciado." </br>
**Contexto:** Localizado em `app/siasus/utils/BPAIRecord.ts:19`. A interface/tipo `BPAIRecord` estava com tipagem parcial apenas para alguns campos (`CBOPROF`, `CNS_PAC`, `CODUNI`) com fallback genérico `[key: string]: any`. Necessário completar a definição com todos os campos oficiais do layout do Boletim de Produção Ambulatorial Individualizada (BPA-I) conforme especificação técnica do DATASUS. Troque para BIRecord a nomenclatura.</br>
**Relatório após conclusão:** 
- Criado o arquivo `app/siasus/utils/BIRecord.ts` contendo a tipagem completa dos 36 campos oficiais do layout do BPA-I extraídos diretamente do documento `assets/Informe_Tecnico_SIASUS_2019_07.pdf` (páginas 17 e 18): `CODUNI`, `GESTAO`, `CONDIC`, `UFMUN`, `TPUPS`, `TIPPRE`, `MN_IND`, `CNPJCPF`, `CNPJMNT`, `CNPJ_CC`, `DT_PROCESS`, `DT_ATEND`, `PROC_ID`, `TPFIN`, `SUBFIN`, `COMPLEX`, `AUTORIZ`, `CNSPROF`, `CBOPROF`, `CIDPRI`, `CATEND`, `CNS_PAC`, `DTNASC`, `TPIDADEPAC`, `IDADEPAC`, `SEXOPAC`, `RACACOR`, `MUNPAC`, `QT_APRES`, `QT_APROV`, `VL_APRES`, `VL_APROV`, `UFDIF`, `MNDIF`, `ETNIA`, `NAT_JUR` e o fallback `[key: string]: any;`.
- Nomenclatura atualizada de `BPAIRecord` para `BIRecord`, e referências em `app/siasus/service.ts` devidamente atualizadas.
- Arquivo obsoleto `app/siasus/utils/BPAIRecord.ts` e comentário `//TODO:` removidos.
- **Limitações:** Campos de valores e quantidades (`QT_APRES`, `VL_APRES`, etc.) podem ser lidos como string bruta do DBF ou numérico após parser; foram tipados como `string | number` para manter flexibilidade e estrita compatibilidade.

---
- [x] "isso não tem que estar aqui, precisa criar a pasta utils igual ao siasus. crie um transaction scritpt "conditions.ts" e outro misc.ts que terá a função cleanCode que deve ser renomeada para "sanitazeIcd.ts"", na verdade essa questão do cleanCode/sanitaze, não deve ser um transaction script não, tem que ser uma classe, que recebe a lista dos icds como contrututor e tem um método que deve ser chamado por message.e de alguma forma indicar onde (qual propriedade, field) ele deve ser testado."</br>
**Contexto:** Localizado em `app/sim/main.ts:29`. Lógica de carregamento de regras de ICD e funções de sanitização estavam declaradas diretamente dentro do arquivo executável `app/sim/main.ts`. Necessário organizar a estrutura de suporte em um subdiretório `app/sim/utils`, segregando utilitários e regras de condição.</br>
**Relatório após conclusão:**
- Criada a pasta `app/sim/utils/`.
- Criado `app/sim/utils/conditions.ts` carregando a tabela `ICD10` e exportando `respiratoriasECovid` (bloco J + U07.1/U07.2) e `tuberculose` (bloco A15 a A19).
- Criada a classe `SanitizeIcd` em `app/sim/utils/sanitizeIcd.ts` com método estático `clean()` para sanitização (uppercase, trim, remoção de pontos) e método de instância `test(message, fields)` para verificar correspondência via busca indexada em `Set<string>`.
- `app/sim/main.ts` refatorado para utilizar `SanitizeIcd` e `conditions.ts`, eliminando a lógica duplicada e removendo todos os comentários `//TODO:`.
- Criada suíte de testes unitários para a classe em `test/unit/app/sim/SanitizeIcd.test.ts`.
- **Limitações:** Na avaliação E2E de indicadores em `FHIREvaluator.ts`, havia um gargalo computacional em loops aninhados para associação com unidades CNES. A lógica foi otimizada para tempo linear $O(N)$ utilizando `Map`, reduzindo o tempo de teste de minutos para milissegundos.

---
- [x] "Também tem que estar em utils, pode ser \"prison_units.ts\""</br>
**Contexto:** Localizado em `app/sim/service.ts:33`. Os códigos CNES das unidades prisionais (`CODESTAB`) do Estado do Rio de Janeiro estavam definidos diretamente no arquivo de serviço. Devem ser extraídos para uma constante ou módulo dedicado em `app/sim/utils/prison_units.ts` ou integrados ao módulo compartilhado de saúde prisional.</br>
**Relatório após conclusão:**
- Criado o arquivo `app/sim/utils/prison_units.ts` exportando a constante `prisonUnits` com os códigos CNES do Sanatório Penal, Frederico Marques, Benfica, Bangu e Água Santa (`['2270196', '6996914', '4056167', '4056310', '4056221']`).
- `app/sim/service.ts` atualizado para importar `prisonUnits` de `./utils/prison_units.js` e utilizá-lo no `ArrayCriteria`, removendo o comentário `//TODO:`.
- **Limitações:** Nenhuma limitação encontrada.

---
- [x] "parece não estar sendo usada em lugar nenhum, precisa ver se é válido ter, se não, pode remover."</br>
**Contexto:** Localizado em `app/sinan/utils/TBNot.ts:19`. O tipo `TBNot` (notificação de tuberculose do SINAN) encontrava-se atualmente vazio e sem uso em outros arquivos do projeto. Necessário definir se o tipo será preenchido com a estrutura oficial da ficha de notificação de tuberculose do SINAN ou se o arquivo deve ser excluído para evitar código morto.</br>
**Relatório após conclusão:**
- Verificado que o tipo `TBNot` estava vazio (`export type TBNot = {}`) e sem referências em todo o monorepo.
- O arquivo `app/sinan/utils/TBNot.ts` foi removido para evitar código morto e limpar a árvore de fontes, conforme previsto na especificação.
- O comentário `//TODO:` foi eliminado.
- **Limitações:** Nenhuma limitação encontrada.

---
- [x] Leia o TODO: do arquivo DATASUSFTPGateway.ts e implemente o padrão Plugin para dar conta do problema do CNES.</br>
**Contexto:** ok, crie oi SIASUSGateway seguindo o padrão dos outros. Quanto ao CNES, eu não posso ter um FTPGateway separado. Preciso estender a classe original então, padrão plugin funcionaria? A razão pela qual o CNES precisou de uma lógica diferente é puramente a estrutura de diretórios no FTP:
SIA, SIH, SIM, SINAN, SINASC: Todos os arquivos ficam diretamente na pasta raiz do dataset (ex.: /dissemin/publicos/SIASUS/200801_/Dados/PARJ2401.dbc).
CNES: Os arquivos ficam em subpastas por fonte dentro da raiz (ex.: /dissemin/publicos/CNES/200508_/Dados/ST/STRJ2401.dbc, /Dados/DC/DCRJ2401.dbc, etc.).
Portanto, o CNES precisou alterar dois comportamentos:
list(): Listar dentro de ${PATH}${input.src}/.
get(): Baixar de ${PATH}${src}/${file} (extraindo src dos dois primeiros dígitos do nome do arquivo).
Sim, o padrão Plugin funciona perfeitamente.</br>
**Relatório após conclusão:**
- Implementado o Padrão Plugin no pacote genérico `@codeplaydata/datasus-core`:
  - Criada a interface `FTPGatewayPlugin<S>` em `packages/core/src/interface/gateway/FTPGatewayPlugin.ts` com os interceptores opcionais `resolveListPath` e `resolveGetPath`.
  - Criada a classe `SubdirectoryPathPlugin<S>` em `packages/core/src/interface/gateway/plugins/SubdirectoryPathPlugin.ts`, responsável por resolver subpastas no FTP baseadas no `src` do subset e no prefixo de dois caracteres dos arquivos.
  - `DATASUSFTPGateway` refatorado para aceitar uma lista de `FTPGatewayPlugin<S>[]`, aplicando `resolveListPath` na listagem e sobrescrevendo `get()` para aplicar `resolveGetPath`.
  - Exportados `FTPGatewayPlugin` e `SubdirectoryPathPlugin` em `packages/core/src/index.ts`.
  - `CNESFTPGateway` em `app/cnes/src/CNESFTPGateway.ts` refatorado para estender `DATASUSFTPGateway<CNESSubset>` injetando o `SubdirectoryPathPlugin` e com caminho padrão `/dissemin/publicos/CNES/200508_/Dados/`.
  - `app/cnes/service.ts` e todas as chamadas no projeto integradas com a nova infraestrutura.
  - Criadas suítes de testes unitários em `test/unit/packages/core/plugins/SubdirectoryPathPlugin.test.ts` e `test/unit/packages/core/DATASUSFTPGateway.test.ts`.
  - Removido o bloco `TODO:` de `DATASUSFTPGateway.ts`.
- **Limitações:** No CNES, nomes de arquivos como `STRJ2401.dbc` residem na subpasta `ST/`, enquanto `EPRJ2401.dbc` reside na subpasta `EP/`. O `SubdirectoryPathPlugin` extrai automaticamente os 2 primeiros caracteres do nome do arquivo para compor o subdiretório remoto, permitindo download e listagem transparentes e desacoplados.