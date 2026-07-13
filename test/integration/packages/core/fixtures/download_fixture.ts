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
import { DbcReader } from "../../../../../packages/core/src/infra/dbc/DbcReader.js";
import { DbcWriter } from "../../../../../packages/core/src/infra/dbc/DbcWriter.js";

// @ts-ignore
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = __dirname;
const TARGET_FILE = join(FIXTURE_DIR, "PAAC1001.dbc");

async function generateSmallFixture() {
    const linkageFixtureDir = join(FIXTURE_DIR, "..", "..", "linkage", "fixtures");
    const linkageFixtureFile = join(linkageFixtureDir, "PA_small.dbc");

    if (existsSync(linkageFixtureFile)) {
        console.log(`Fixture pequena já existe: ${linkageFixtureFile}`);
        return;
    }

    if (!existsSync(linkageFixtureDir)) {
        mkdirSync(linkageFixtureDir, { recursive: true });
    }

    console.log(`Gerando fixture pequena de teste em: ${linkageFixtureFile}...`);
    
    const reader = await DbcReader.load(TARGET_FILE);
    try {
        const writer = await DbcWriter.initialize(linkageFixtureFile, reader.fields);
        const records = await reader.readBatch(100);
        await writer.write(records);
        await writer.close();
        console.log(`Fixture pequena gerada com sucesso: ${linkageFixtureFile}`);
    } catch (err) {
        console.error("Falha ao gerar fixture pequena:", err);
        process.exit(1);
    } finally {
        reader.remove();
    }
}

async function main() {
    if (!existsSync(TARGET_FILE)) {
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
    } else {
        console.log(`Fixture principal já existe: ${TARGET_FILE}`);
    }

    // Gerar a fixture pequena para o teste de linkage
    await generateSmallFixture();
}

main();

