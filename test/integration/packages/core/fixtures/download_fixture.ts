/**
 * download_fixture.ts
 * 
 * Script para baixar um arquivo .dbc pequeno do SIASUS para usar como fixture nos testes de integração.
 * Baixa PAAC1001.dbc (Acre, Janeiro/2010) que é um dos menores arquivos disponíveis.
 * 
 * Uso: npx tsx test/integration/packages/core/fixtures/download_fixture.ts
 */

import { Client as FtpClient } from "basic-ftp";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = __dirname;
const TARGET_FILE = join(FIXTURE_DIR, "PAAC1001.dbc");

async function main() {
    if (existsSync(TARGET_FILE)) {
        console.log(`Fixture já existe: ${TARGET_FILE}`);
        return;
    }

    if (!existsSync(FIXTURE_DIR)) {
        mkdirSync(FIXTURE_DIR, { recursive: true });
    }

    const client = new FtpClient();
    try {
        await client.access({ host: "ftp.datasus.gov.br" });
        console.log("Conectado ao FTP...");
        
        await client.downloadTo(
            createWriteStream(TARGET_FILE),
            "/dissemin/publicos/SIASUS/200801_/Dados/PAAC1001.dbc"
        );
        
        console.log(`Fixture baixada com sucesso: ${TARGET_FILE}`);
    } catch (err) {
        console.error("Falha ao baixar fixture:", err);
        process.exit(1);
    } finally {
        client.close();
    }
}

main();
