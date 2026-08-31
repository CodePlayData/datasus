import { DbcReader } from '../packages/core/src/index.js';

async function main() {
    const reader = await DbcReader.load('./data/EPRJ2601.dbc');
    const prisonTeams: any[] = [];
    const psicTeams: any[] = [];
    const esbPrisTeams: any[] = [];
    const coreEappTeams: any[] = [];

    await reader.forEachRecords(async (rec) => {
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            const dtDesat = String(rec.DT_DESAT || '').trim();
            const isActive = !dtDesat || dtDesat === '900001' || dtDesat === '000000';
            if (isActive) {
                const tipo = String(rec.TIPO_EQP || rec.TP_EQUIPE || '').trim();
                const name = String(rec.NOME_EQP || rec.DS_EQUIPE || '').toUpperCase();
                const ine = String(rec.IDEQUIPE || rec.INE || '').trim();
                const cnes = String(rec.CNES || rec.CO_UNIDADE || '').trim();

                const isPrison = tipo === '74' || tipo === '46' || name.includes('SEAP') || name.includes('PRISIONAL') ||
                    ['4056167', '4056221', '4056310', '2270196', '6996914', '0954063', '4255682', '5462045', '5462169', '5463416', '5471591', '9280677'].includes(cnes);

                if (isPrison) {
                    const item = { ine, name, cnes, tipo };
                    prisonTeams.push(item);
                    if (name.includes('PSIC')) {
                        psicTeams.push(item);
                    } else if (name.includes('ESB') || name.includes('BUCAL') || tipo === '71') {
                        esbPrisTeams.push(item);
                    } else {
                        coreEappTeams.push(item);
                    }
                }
            }
        }
    });

    console.log(`Total prison-related teams found: ${prisonTeams.length}`);
    console.log(`  • Equipes de Atenção Psicológica (PSIC): ${psicTeams.length}`);
    psicTeams.forEach(t => console.log(`      - INE: ${t.ine} | CNES: ${t.cnes} | Nome: ${t.name}`));

    console.log(`\n  • Equipes de Saúde Bucal Prisional: ${esbPrisTeams.length}`);
    esbPrisTeams.forEach(t => console.log(`      - INE: ${t.ine} | CNES: ${t.cnes} | Nome: ${t.name}`));

    console.log(`\n  • Equipes de Atenção Primária Prisional Core (eAPP Médica/Enfermagem): ${coreEappTeams.length}`);
    coreEappTeams.forEach(t => console.log(`      - INE: ${t.ine} | CNES: ${t.cnes} | Nome: ${t.name}`));

    reader.remove(false);
}

main().catch(console.error);
