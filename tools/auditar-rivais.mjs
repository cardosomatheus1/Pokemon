/* Auditoria do catálogo e da política de seleção, sem remover golpes.
   --antes=mapa.json aceita dex:nível -> nomes da política anterior. */
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import KANTO from '../content/pokemon_kanto_v1.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import {golpeTreinador} from '../engine/catalogo-golpes.mjs';
import {nivelDoGolpe} from '../engine/repertorio.mjs';
import {movesetDoRival,VERSAO_MOVESET_RIVAL} from '../app/modules/moveset-dados.mjs';

export function auditarCatalogo(pack){
  const gs=Object.values(pack.golpes).flat().map(g=>golpeTreinador(pack,g.n));
  const nivel=g=>Math.min(...Object.values(pack.golpes).filter(l=>l.some(x=>x.n===g.n)).map(l=>nivelDoGolpe(g,l)));
  const pares=[];
  for(const a of gs)for(const b of gs){
    if(a.n===b.n||a.t!==b.t||a.cat!==b.cat||a.efeitos.length||b.efeitos.length)continue;
    if(b.p>=a.p&&b.acc>=a.acc&&(b.p>a.p||b.acc>a.acc))
      pares.push({inferior:a.n,superior:b.n,tipo:a.t,categoria:a.cat,
        inferiorAbre:nivel(a),superiorAbre:nivel(b),poder:[a.p,b.p],precisao:[a.acc,b.acc]});
  }
  return {golpes:gs.length,pares:pares.length,dominancia:pares};
}

export function compararPoliticas(pack,antes){
  let combinacoes=0,ordemAlterada=0;const conteudoAlterado=[];
  for(const e of [...pack.especies,...(pack.lendarios??[])])for(let nivel=1;nivel<=100;nivel++){
    const key=`${e.dex}:${nivel}`,a=antes[key],b=movesetDoRival(pack,e.dex,nivel);
    if(!a)continue;combinacoes++;
    if(JSON.stringify(a)!==JSON.stringify(b))ordemAlterada++;
    if([...a].sort().join()!==[...b].sort().join())conteudoAlterado.push({dex:e.dex,nivel,antes:a,depois:b});
  }
  return {combinacoes,ordemAlterada,conteudoAlterado};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const arg=k=>process.argv.find(x=>x.startsWith(`--${k}=`))?.slice(k.length+3);
  const antes=arg('antes');
  const r={politica:VERSAO_MOVESET_RIVAL,tbe:'tbe-4',
    criterio:'mesmo tipo/categoria, efeitos ausentes, poder e precisão >=, pelo menos um estritamente maior; antes da liberação o inferior ainda tem uso',
    ressalva:'dominância de dano esperado pode empatar por arredondamento/vida restante; não certifica maior chance de vitória em todo confronto',
    kanto:auditarCatalogo(KANTO),original:auditarCatalogo(ORIGINAL),
    ...(antes?{comparacao:compararPoliticas(KANTO,JSON.parse(readFileSync(antes)))}:{})};
  if(arg('saida'))writeFileSync(arg('saida'),JSON.stringify(r,null,2)+'\n');
  console.log(JSON.stringify({politica:r.politica,kantoPares:r.kanto.pares,originalPares:r.original.pares,comparacao:r.comparacao&&{combinacoes:r.comparacao.combinacoes,ordemAlterada:r.comparacao.ordemAlterada,conteudoAlterado:r.comparacao.conteudoAlterado.length}}));
}
