/* Sabotagem dirigida às regras AT6: cada defeito roda numa cópia isolada.
 * Não altera a árvore de trabalho e não representa o Q2 legado integral. */
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DEFEITOS } from '../test/defeitos-plantados.mjs';
const origem=fileURLToPath(new URL('../',import.meta.url));
const caixa=mkdtempSync(join(tmpdir(),'arena-q2-'));
const resultados=[];
const progressao=process.argv.includes('--grupo=progressao');
const avanco=process.argv.includes('--grupo=avanco');
const catalogo=process.argv.includes('--grupo=catalogo');
try {
  for(const pasta of ['engine','content','server','app','test','tools'])
    cpSync(join(origem,pasta),join(caixa,pasta),{recursive:true});
  for(const d of DEFEITOS.filter(d=>(catalogo?/^S903\d\d$/:avanco?/^S902\d\d$/:progressao?/^S901\d\d$/:/^S900\d\d$/).test(d.id))) {
    const arquivo=join(caixa,d.arquivo),original=readFileSync(join(origem,d.arquivo),'utf8');
    if(!original.includes(d.de))throw new Error(`âncora perdida: ${d.id}`);
    writeFileSync(arquivo,original.replace(d.de,d.para));
    const so=catalogo?'catalogo-treinador':avanco?'avanco-combate,combate-continuo,run-servidor':progressao?'progressao-offline,time-aprende':d.arquivo.includes('xp-jornada')?'xp-jornada-repeticao'
      :d.arquivo.includes('treino-batalha')?'treino-batalha,batalha-precisao':'arena-treinadores';
    const r=spawnSync(process.execPath,['tools/testar-arena.mjs',`--so=${so}`],{cwd:caixa,encoding:'utf8',timeout:60000});
    writeFileSync(arquivo,original);
    const linha=r.stdout?.trim().split('\n').at(-1);
    let resumo;try{resumo=JSON.parse(linha);}catch{}
    const capturado=r.status===1&&Array.isArray(resumo?.falhas)&&resumo.falhas.length>0;
    const resultado={id:d.id,nome:d.nome,capturado,
      falhas:resumo?.falhas??[],...(resumo?{}:{erro:r.error?.message??r.stderr?.slice(-2000)})};
    resultados.push(resultado);console.log(JSON.stringify(resultado));
  }
}finally{rmSync(caixa,{recursive:true,force:true});}
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);
const relatorio={escopo:catalogo?'somente mutantes de catálogo TBE; não é Q2 legado integral':avanco?'somente mutantes Avanço real novos; não é Q2 legado integral':progressao?'somente mutantes XP/offline novos; não é Q2 legado integral':'somente mutantes AT6 novos; não é Q2 legado integral',total:resultados.length,
  capturados:resultados.filter(r=>r.capturado).length,resultados};
if(saida)writeFileSync(saida,JSON.stringify(relatorio,null,2)+'\n');
console.log(JSON.stringify({total:relatorio.total,capturados:relatorio.capturados}));
process.exitCode=resultados.every(r=>r.capturado)?0:1;
