import { DbcReader } from '../packages/core/src/index.js';
import { existsSync } from 'node:fs';

async function inspectSinanFull() {
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('1. INSPEÇÃO COMPLETA DO SINAN (TUBEBR25.dbc) — TRAT_SUPER E TRATSUP_AT');
    console.log('═══════════════════════════════════════════════════════════════════════');
    const file = './data/TUBEBR25.dbc';
    if (!existsSync(file)) {
        console.log(`Arquivo ${file} não encontrado.`);
        return;
    }

    const reader = await DbcReader.load(file);
    let total = 0;
    let rjTotal = 0;
    const rjTratSuper: Record<string, number> = {};
    const rjTratSupAt: Record<string, number> = {};
    const rjPopLiberTratSuper: Record<string, number> = {};
    const rjPopLiberTratSupAt: Record<string, number> = {};
    let countPopLiber1 = 0;
    let countPopLiber2 = 0;
    let countPopLiber9 = 0;
    let countPopLiberBlank = 0;

    await reader.forEachRecords(async (rec) => {
        total++;
        const munNot = String(rec.ID_MUNICIP || '').trim();
        const munRes = String(rec.ID_MN_RESI || '').trim();

        if (munNot === '330455' || munRes === '330455') {
            rjTotal++;
            const ts = String(rec.TRAT_SUPER || '').trim();
            const tsa = String(rec.TRATSUP_AT || '').trim();
            const popLiber = String(rec.POP_LIBER || '').trim();

            rjTratSuper[ts || '(em branco)'] = (rjTratSuper[ts || '(em branco)'] || 0) + 1;
            rjTratSupAt[tsa || '(em branco)'] = (rjTratSupAt[tsa || '(em branco)'] || 0) + 1;

            if (popLiber === '1') {
                countPopLiber1++;
                rjPopLiberTratSuper[ts || '(em branco)'] = (rjPopLiberTratSuper[ts || '(em branco)'] || 0) + 1;
                rjPopLiberTratSupAt[tsa || '(em branco)'] = (rjPopLiberTratSupAt[tsa || '(em branco)'] || 0) + 1;
            } else if (popLiber === '2') {
                countPopLiber2++;
            } else if (popLiber === '9') {
                countPopLiber9++;
            } else {
                countPopLiberBlank++;
            }
        }
    });

    console.log(`Total geral de registros no Brasil (TUBEBR25): ${total.toLocaleString()}`);
    console.log(`Total no Município do Rio de Janeiro (330455): ${rjTotal.toLocaleString()}`);
    console.log(`Distribuição de POP_LIBER no MRJ:`);
    console.log(`  • POP_LIBER = 1 (População Privada de Liberdade): ${countPopLiber1.toLocaleString()}`);
    console.log(`  • POP_LIBER = 2 (Não é PPL): ${countPopLiber2.toLocaleString()}`);
    console.log(`  • POP_LIBER = 9 (Ignorado): ${countPopLiber9.toLocaleString()}`);
    console.log(`  • POP_LIBER em branco: ${countPopLiberBlank.toLocaleString()}`);

    console.log(`\nValores de TRAT_SUPER no MRJ (TODAS as notificações de TB):`, rjTratSuper);
    console.log(`Valores de TRATSUP_AT no MRJ (TODAS as notificações de TB):`, rjTratSupAt);
    console.log(`Valores de TRAT_SUPER especificamente para PPL (POP_LIBER=1):`, rjPopLiberTratSuper);
    console.log(`Valores de TRATSUP_AT especificamente para PPL (POP_LIBER=1):`, rjPopLiberTratSupAt);

    reader.remove(false);
}

async function inspectSiasusSigtapTB() {
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('2. INSPEÇÃO DE PROCEDIMENTOS SIGTAP DE TB NO SIASUS (PARJ2601a / PARJ2601b)');
    console.log('═══════════════════════════════════════════════════════════════════════');

    const prisonCnesSet = new Set(['4056167', '4056221', '4056310', '2270196', '2270420', '5546583', '8078106', '0954063', '4255682', '5462045', '5462169']);
    const files = ['./data/PARJ2601a.dbc', './data/PARJ2601b.dbc'].filter(f => existsSync(f));

    for (const f of files) {
        console.log(`\nProcessando ${f}...`);
        const reader = await DbcReader.load(f);
        let totalMrj = 0;
        let tdoMrj = 0;
        let tdoPrison = 0;
        const tbProceduresMrj: Record<string, number> = {};
        const tbProceduresPrison: Record<string, number> = {};

        await reader.forEachRecords(async (rec) => {
            const mun = String(rec.PA_UFMUN || rec.CODUFMUN || '').trim();
            if (mun === '330455' || mun.startsWith('330455')) {
                totalMrj++;
                const proc = String(rec.PA_PROC_ID || rec.PROC_ID || '').trim();
                const cnes = String(rec.PA_CODUNI || rec.CNES || '').trim();
                const qty = Number(rec.PA_QTDPRO || rec.QTDPRO) || 1;

                // Procedimentos de TB: TDO (03.01.08.016-0, 01.01.01.004-4), Baciloscopia, TRM-TB (02.02.08.008-0, 02.14.01.001-5)
                const isTbProc = proc.startsWith('030108016') || proc.startsWith('010101004') ||
                                 proc.startsWith('020208008') || proc.startsWith('021401001') ||
                                 proc.startsWith('030101007') && String(rec.PA_CIDPRI || '').startsWith('A15');

                if (isTbProc || proc.includes('0301080160') || proc.includes('0101010044')) {
                    tbProceduresMrj[proc] = (tbProceduresMrj[proc] || 0) + qty;
                    if (proc.startsWith('030108016') || proc.startsWith('010101004')) {
                        tdoMrj += qty;
                    }

                    if (prisonCnesSet.has(cnes)) {
                        tbProceduresPrison[proc] = (tbProceduresPrison[proc] || 0) + qty;
                        if (proc.startsWith('030108016') || proc.startsWith('010101004')) {
                            tdoPrison += qty;
                        }
                    }
                }
            }
        });

        console.log(`Total de registros no MRJ em ${f}: ${totalMrj.toLocaleString()}`);
        console.log(`Procedimentos de Tuberculose registrados no MRJ:`, tbProceduresMrj);
        console.log(`Total de atendimentos/tomadas de TDO no MRJ: ${tdoMrj.toLocaleString()}`);
        console.log(`Procedimentos de TB faturados em CNES Prisionais da SEAP:`, tbProceduresPrison);
        console.log(`Total de TDO em CNES Prisionais: ${tdoPrison.toLocaleString()}`);

        reader.remove(false);
    }
}

async function main() {
    await inspectSinanFull();
    await inspectSiasusSigtapTB();
}

main().catch(console.error);
