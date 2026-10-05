/* Recorte autorizado pelo dono: valida superfícies alteradas sem carregar a
 * suíte integral. Não substitui os portões de tag nem a inspeção visual. */
import { writeFileSync } from 'node:fs';
const padrao = ['arena-treinadores','treino-batalha','batalha-precisao','xp-jornada-repeticao',
  'jornada-servidor','jornada','recompensa-pve','liga-stake','liga-home','liga-pareamento',
  'liga-mmr','liga-pontos','liga-integridade','liga-temporada','liga-ranking',
  'equipe-snapshot','presets','treino-builds','treino-preco','ginasios','carteira-servidor','banco-servidor',
  'liga-partida','liga-replay','liga-palco','jornada-equilibrio','primitivas','conteudo','treino-trocas'];
const selecionadas = process.argv.find(x=>x.startsWith('--so='))?.slice(5).split(',') ?? padrao;
const resultados=[];
for (const nome of selecionadas) {
  const modulo = await import(new URL(`../test/${nome}.mjs`,import.meta.url));
  const suite=await modulo.suite();
  const resultado=await suite.rodar(); resultados.push(resultado);
  console.log(JSON.stringify(resultado));
}
const relatorio={escopo:'focado AT6; sem navegador e sem suíte integral',
  total:resultados.reduce((n,r)=>n+r.total,0),falhas:resultados.flatMap(r=>r.falhas.map(f=>({...f,suite:r.nome}))),resultados};
const saida=process.argv.find(x=>x.startsWith('--saida='))?.slice(8);
if(saida)writeFileSync(saida,JSON.stringify(relatorio,null,2)+'\n');
console.log(JSON.stringify({total:relatorio.total,falhas:relatorio.falhas}));
process.exitCode=relatorio.falhas.length?1:0;
