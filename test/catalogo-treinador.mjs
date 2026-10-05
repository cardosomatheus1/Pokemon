import {spawnSync} from 'node:child_process';
import {criarSuite,ok,igual} from './harness.mjs';
import KANTO from '../content/pokemon_kanto_v1.mjs';
import ORIGINAL from '../content/original_v1.mjs';
import {criarCatalogoTreinador,golpeTreinador} from '../engine/catalogo-golpes.mjs';
import {validarPack} from '../engine/pack.mjs';
import {simular,montarLutador} from '../engine/treino-batalha.mjs';
import {xpParaNivel} from '../engine/nivel-criatura.mjs';
import {fichaDoGolpe} from '../app/modules/golpe-ficha.mjs';
const semCatalogo=p=>{const q={...p};delete q.catalogoTreinador;return q;};
export function suite(){const s=criarSuite('catalogo-treinador');
  s.teste('packs publicam poder, categoria, precisão e efeitos sem alterar o catálogo da arena comum',()=>{
    for(const p of[KANTO,ORIGINAL])for(const g of Object.values(p.golpes).flat()){
      const t=p.catalogoTreinador?.[g.n];ok(t,`sem metadado: ${g.n}`);
      igual(t.p,g.p);igual(t.cat,g.cat);igual(t.t,g.t);igual(t.acc,g.acc??.92);
      igual(JSON.stringify(t.efeitos),'[]');
    }
    igual(KANTO.golpes.normal.find(g=>g.n==='Body Slam').acc,undefined);
  });
  s.teste('Surf e Hydro Pump preservam risco diferente; ausência usa 92% no modo treinador',()=>{
    igual(golpeTreinador(KANTO,'Surf').acc,1);igual(golpeTreinador(KANTO,'Hydro Pump').acc,.8);
    igual(golpeTreinador(semCatalogo(KANTO),'Body Slam').acc,.92);igual(golpeTreinador(KANTO,'inexistente'),null);
  });
  s.teste('normalizar é puro e não inventa efeitos a partir do nome',()=>{
    const raw={tipo:[{n:'Quick Attack',t:'tipo',p:40,cat:'fis',acc:1,fx:'melee'}]},antes=JSON.stringify(raw);
    const c=criarCatalogoTreinador(raw);igual(JSON.stringify(raw),antes);igual(JSON.stringify(c['Quick Attack'].efeitos),'[]');
  });
  s.teste('metadados explícitos preservam todos os eventos e presets em sementes de holdout',()=>{
    const a=[{dex:9,nivel:50,golpes:['Surf','Hydro Pump','Body Slam']}];
    const b=[{dex:6,nivel:50,golpes:['Fire Blast','Quick Attack','Hyper Beam']}];
    for(const preset of['balanced','aggressive','defensive','focus'])for(let seed=0;seed<80;seed++)
      igual(JSON.stringify(simular(KANTO,a,b,seed,{preset})),JSON.stringify(simular(semCatalogo(KANTO),a,b,seed,{preset})));
  });
  s.teste('a TBE consome a precisão declarada, não uma segunda régua de UI',()=>{
    const p={...KANTO,catalogoTreinador:{...KANTO.catalogoTreinador,'Body Slam':{...golpeTreinador(KANTO,'Body Slam'),acc:.6}}};
    const f=montarLutador(p,{dex:1,nivel:5,golpes:['Body Slam']},'A',0);igual(f.golpes[0].acc,.6);
  });
  s.teste('carregamento recusa metadados incompletos, inválidos ou efeitos não implementados',()=>{
    const n='Body Slam',g=golpeTreinador(KANTO,n);
    for(const ruim of[{...g,acc:0},{...g,acc:NaN},{...g,acc:1.1},{...g,cat:'status'},{...g,p:1},{...g,efeitos:['paralisia']},undefined]){
      const p={...KANTO,catalogoTreinador:{...KANTO.catalogoTreinador,[n]:ruim}};
      ok(validarPack(p).some(e=>e.includes('catalogoTreinador')),`aceitou ${JSON.stringify(ruim)}`);
    }
    igual(validarPack(semCatalogo(KANTO)).length,0,'pack legado foi recusado');
  });
  s.teste('ficha mostra poder, categoria, precisão e ausência de secundários, inclusive exclusivos',()=>{
    const f=fichaDoGolpe(KANTO,'Quick Attack');igual(f.poder,40);igual(f.categoria,'físico');igual(f.precisao,100);
    ok(f.resumo.includes('poder 40')&&f.resumo.includes('acerto 100%'));
    ok(f.descricao.includes('Sem efeitos adicionais'));ok(f.descricao.includes('crítico'));
    const h=fichaDoGolpe(KANTO,'Hyper Beam');ok(!/recarrega|paralisa|prioridade/.test(h.descricao));
    igual(fichaDoGolpe(KANTO,'ausente'),null);
  });
  s.teste('Centro integra metadados reais nas duas abas e mantém os controles de seleção',()=>{
    // O teste de análise dos módulos importa UI sem DOM e pode deixar uma
    // avaliação rejeitada no cache do Node. Execute o DOM sintético isolado.
    const codigo=`import {validarCentro} from ${JSON.stringify(import.meta.url)}; await validarCentro();`;
    const r=spawnSync(process.execPath,['--input-type=module','-e',codigo],{encoding:'utf8',timeout:30000});
    igual(r.status,0,r.stderr||r.error?.message);
  });
  return s;
}


export async function validarCentro(){
    const antes={document:globalThis.document,localStorage:globalThis.localStorage};
    const alvos=[{innerHTML:''},{innerHTML:''}];
    globalThis.document={querySelector:()=>null,querySelectorAll:sel=>sel==='#idleCentro, #offCentro'?alvos:[]};
    globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
    try{
      const {pintarCentro}=await import('../app/modules/idle-paineis.mjs');
      pintarCentro({criaturas:[{id:'teste',dex:9,nivel:100,xp:xpParaNivel(100),iv:Array(6).fill(15),naCaixa:false,potencial:50,golpes:['Surf','Hydro Pump']}],bolsa:{},doces:{}});
      igual(alvos[0].innerHTML,alvos[1].innerHTML);
      const surf=alvos[0].innerHTML.match(/<button[^>]*data-golpe="Surf"[^>]*>[^<]*<\/button>/)?.[0];
      const hydro=alvos[0].innerHTML.match(/<button[^>]*data-golpe="Hydro Pump"[^>]*>[^<]*<\/button>/)?.[0];
      const surfTexto=surf?.replace(/<[^>]*>/g,''),hydroTexto=hydro?.replace(/<[^>]*>/g,'');
      ok(surfTexto?.includes('acerto 100%')&&surfTexto.includes('poder 90'),'Surf sem seus dados visíveis');
      ok(hydroTexto?.includes('acerto 80%')&&hydroTexto.includes('poder 110'),'Hydro Pump sem risco explícito visível');
      ok(surf.includes('data-cria="teste"')&&surf.includes(' on'),'controle selecionado perdeu a identidade');
    }finally{Object.assign(globalThis,antes);}
}
