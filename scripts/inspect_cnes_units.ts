import { DbcReader } from '../packages/core/src/index.js';

async function main() {
    const epReader = await DbcReader.load('./data/EPRJ2601.dbc');
    const cnesSet = new Set<string>();
    const cnesByTeamType: Record<string, Set<string>> = {};
    const teamsByCnes: Record<string, any[]> = {};

    await epReader.forEachRecords(async (rec) => {
        const mun = String(rec.CODUFMUN || rec.CO_MUNICIPIO || '').trim();
        if (mun === '330455' || mun.startsWith('330455')) {
            const dtDesat = String(rec.DT_DESAT || '').trim();
            if (!dtDesat || dtDesat === '900001' || dtDesat === '000000') {
                const cnes = String(rec.CNES || rec.CO_UNIDADE || '').trim();
                const tipo = String(rec.TIPO_EQP || rec.TP_EQUIPE || '').trim();
                cnesSet.add(cnes);
                if (!cnesByTeamType[tipo]) cnesByTeamType[tipo] = new Set();
                cnesByTeamType[tipo].add(cnes);

                if (!teamsByCnes[cnes]) teamsByCnes[cnes] = [];
                teamsByCnes[cnes].push({
                    INE: rec.IDEQUIPE || rec.INE,
                    NOME: rec.NOME_EQP,
                    TIPO: tipo
                });
            }
        }
    });

    console.log(`Total unique CNES hosting active teams in MRJ: ${cnesSet.size}`);
    console.log('Unique CNES by Team Type:');
    for (const [tp, set] of Object.entries(cnesByTeamType)) {
        console.log(`  Tipo ${tp}: ${set.size} unidades distintas`);
    }

    console.log('\nPrison Teams (Tipo 74) by CNES:');
    for (const cnes of cnesByTeamType['74'] || []) {
        console.log(`  CNES ${cnes}: ${teamsByCnes[cnes].length} equipes prisionais`);
        for (const t of teamsByCnes[cnes]) {
            console.log(`    - INE: ${t.INE} | Nome: ${t.NOME}`);
        }
    }

    console.log('\nConsultório na Rua (Tipo 73) by CNES:');
    for (const cnes of cnesByTeamType['73'] || []) {
        console.log(`  CNES ${cnes}: ${teamsByCnes[cnes].length} equipes de rua`);
        for (const t of teamsByCnes[cnes]) {
            console.log(`    - INE: ${t.INE} | Nome: ${t.NOME}`);
        }
    }

    epReader.remove(false);
}

main().catch(console.error);
