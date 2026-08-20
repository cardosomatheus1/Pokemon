/* Pintura das arenas — cinco peles sobre a MESMA silhueta.
 *
 * A geometria não muda, e isso é decisão, não preguiça: movimento, zona de
 * cada lutador e limite de deslocamento são calculados sobre a superelipse do
 * `render.mjs`. Trocar o contorno por arena significaria recalibrar a
 * coreografia cinco vezes e abrir a porta para lutador andando fora do mapa.
 * O que muda é a pele — paleta, textura, o que cerca a ilha, os enfeites.
 *
 * Cada arena entrega duas funções:
 *   estatico(c)  desenhado UMA vez por rodada, numa camada guardada
 *   fundo(t)     desenhado a cada quadro, porque o que cerca a ilha é animado
 *
 * A SEMENTE DE CADA CENÁRIO É FIXA, e de propósito. O enfeite de uma arena é
 * a identidade dela: o Coliseu com as colunas sempre nos mesmos quatro pontos
 * é reconhecível; o Coliseu redesenhado a cada rodada é ruído. O que varia
 * entre rodadas é QUAL arena sai — e isso vem da raiz, em `arenas-dados.mjs`.
 */
import { $ } from './dom.mjs';
import { rng } from './motor.mjs';
import {
  CX, CY, GRASS_RX, GRASS_RY, H, NSHAPE, SAND_RX, SAND_RY, W,
  aplicarCenario, ell, espalhar, isle, map, miolo, naBorda, piso,
} from './render.mjs';
import { ARENAS, sortearArena } from './arenas-dados.mjs';

/* ---------------------------------------------------------------- 1
   ILHA TROPICAL — a ilha do v0.8, preservada byte a byte.

   A v1.0 do porte reescreveu este cenário com os helpers e, no caminho,
   perdeu uma linha do laço de capim (o segundo pixel de sombra, a 25%).
   Parece nada, mas o sorteio é sequencial: um R() a menos por tufo desloca
   os 1.100 tufos e tudo o que vem depois — flor, pedra, arbusto. Mantida a
   NOSSA versão, que é a original.                                        */
function ilhaTropical(c){
  piso(c, '#efdda6', '#e3cd92');
  miolo(c, '#4f9c30', '#6fc247');
  const R = rng(20260814);

  // tufos de capim (o "ruído" que dá cara de tileset de GBA)
  espalhar(R, 1100, 6, (x,y,R) => {
    const r = R();
    c.fillStyle = r < .45 ? 'rgba(58,138,42,.75)'
                : r < .80 ? 'rgba(140,212,102,.60)'
                          : 'rgba(84,176,60,.70)';
    const w = 2 + (R()*3|0);
    c.fillRect(x|0, y|0, w, 1);
    if (R() < .45) c.fillRect((x|0)+1, (y|0)-1, 1, 1);
    if (R() < .25) c.fillRect((x|0)-1, (y|0)+1, 1, 1);
  });
  // manchas de grama mais escura, pra quebrar o verde chapado
  espalhar(R, 34, 20, (x,y,R) => {
    c.fillStyle = 'rgba(70,160,48,.35)';
    ell(c,x,y, 9+R()*14, 6+R()*9); c.fill();
  });
  // florzinhas
  espalhar(R, 90, 14, (x,y,R) => {
    const col = ['#f4e04d','#f27676','#f2a2d8','#ffffff'][R()*4|0];
    c.fillStyle = '#3f8a2c'; c.fillRect(x|0, (y|0)+2, 1, 2);
    c.fillStyle = col; c.fillRect(x|0, y|0, 2, 2);
  });
  // pedrinhas
  espalhar(R, 38, 10, (x,y) => {
    c.fillStyle = '#8a939a'; c.fillRect(x|0, y|0, 5, 4);
    c.fillStyle = '#b9c1c6'; c.fillRect(x|0, y|0, 5, 2);
    c.fillStyle = '#6d757b'; c.fillRect(x|0, (y|0)+3, 5, 1);
  });
  // arbustos
  espalhar(R, 20, 18, (x,y) => {
    c.fillStyle = 'rgba(0,0,0,.16)'; ell(c,x,y+3,7,3); c.fill();
    c.fillStyle = '#2f7a22'; ell(c,x,y,7,5.5); c.fill();
    c.fillStyle = '#47a233'; ell(c,x,y-1,6,4.5); c.fill();
    c.fillStyle = '#6cc44a'; ell(c,x-1.5,y-2,3,2); c.fill();
  });
  // detalhe na areia
  for (let i=0;i<340;i++){
    const p = naBorda(R, 1.01 + R()*0.13);
    c.fillStyle = R() < .5 ? 'rgba(206,182,126,.55)' : 'rgba(250,238,196,.5)';
    c.fillRect(p.x|0, p.y|0, 2, 1);
  }
}
function marTropical(t){
  map.fillStyle = '#2f74d6'; map.fillRect(0,0,W,H);
  map.fillStyle = '#2963bd';
  for (let y=0; y<H; y+=8) map.fillRect(0, y + ((t*6)%8|0), W, 3);
  const phase = (t * 7) % 13;
  map.lineWidth = 2;
  for (let k=0;k<7;k++){
    const g = 5 + k*13 + phase;
    map.strokeStyle = `rgba(255,255,255,${0.30 - k*0.035})`;
    isle(map, CX, CY, SAND_RX+g, SAND_RY+g); map.stroke();
  }
  map.strokeStyle = 'rgba(255,255,255,.75)'; map.lineWidth = 3;
  isle(map, CX, CY, SAND_RX+2, SAND_RY+2); map.stroke();
}

/* ---------------------------------------------------------------- 2
   CAMPO GELADO — lago rachado, boneco de neve e pinheiros            */
function campoNeve(c){
  piso(c, '#cfe6f2', '#bcd9ea');
  miolo(c, '#e8f4fb', '#f5fbff');
  const R = rng(20260901);

  // faixas diagonais claras
  c.save(); isle(c,CX,CY,GRASS_RX,GRASS_RY); c.clip();
  c.fillStyle = 'rgba(198,231,246,.55)';
  for (let d=-H; d<W+H; d+=22) { c.beginPath();
    c.moveTo(d,0); c.lineTo(d+11,0); c.lineTo(d+11-H,H); c.lineTo(d-H,H); c.fill(); }
  c.restore();

  // lago congelado rachado — a água escura aparecendo pela fenda
  const lx = CX+6, ly = CY+4;
  c.fillStyle = '#a8c4d6'; ell(c,lx,ly,62,44); c.fill();
  c.fillStyle = '#c3dcea'; ell(c,lx,ly-2,58,40); c.fill();
  c.fillStyle = '#d8ecf7'; ell(c,lx-4,ly-5,48,31); c.fill();
  c.strokeStyle = '#5d8ba8'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(lx-40,ly-14); c.lineTo(lx-12,ly-2);
  c.lineTo(lx+6,ly-16); c.lineTo(lx+34,ly+2); c.stroke();
  c.strokeStyle = '#7fa9c2'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(lx-12,ly-2); c.lineTo(lx-18,ly+18); c.stroke();
  c.beginPath(); c.moveTo(lx+6,ly-16); c.lineTo(lx+14,ly-34); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(lx-34,ly+12); c.lineTo(lx-6,ly+22); c.stroke();
  c.lineCap = 'butt';

  // boneco de neve
  const bx = CX-84, by = CY-92;
  c.fillStyle = 'rgba(0,0,0,.13)'; ell(c,bx,by+13,13,4); c.fill();
  c.fillStyle = '#ffffff'; ell(c,bx,by+7,10,8); c.fill();
  c.fillStyle = '#eef6fb'; ell(c,bx,by-3,7.5,6.5); c.fill();
  c.fillStyle = '#ffffff'; ell(c,bx,by-12,5.5,5); c.fill();
  c.fillStyle = '#2b2b2b'; c.fillRect(bx-5,by-18,11,3); c.fillRect(bx-3,by-23,7,5);
  c.fillStyle = '#e2622e'; c.fillRect(bx+5,by-12,4,1.6);           // cenoura
  c.fillStyle = '#1a1a1a'; c.fillRect(bx-3,by-14,1.6,1.6); c.fillRect(bx+1,by-14,1.6,1.6);
  c.fillStyle = '#8a5a34'; c.fillRect(bx-14,by-6,8,1.4); c.fillRect(bx+6,by-6,8,1.4);
  c.fillStyle = '#c0392b'; c.fillRect(bx-6,by-8,12,2.5);           // cachecol

  // pinheiros nevados
  const pinheiro = (x,y,s) => {
    c.fillStyle = 'rgba(0,0,0,.12)'; ell(c,x,y+2,7*s,2.5*s); c.fill();
    c.fillStyle = '#6b4a2a'; c.fillRect(x-1.5*s, y-3*s, 3*s, 5*s);
    for (let k=0;k<3;k++){
      const w = (9-k*2.4)*s, h = 7*s, yy = y - 4*s - k*5*s;
      c.fillStyle = '#1f6b46'; c.beginPath();
      c.moveTo(x, yy-h); c.lineTo(x-w, yy); c.lineTo(x+w, yy); c.fill();
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath();
      c.moveTo(x, yy-h); c.lineTo(x-w*0.6, yy-h*0.35); c.lineTo(x+w*0.6, yy-h*0.35); c.fill();
    }
  };
  pinheiro(CX+92, CY-118, 1.0); pinheiro(CX-96, CY+96, 1.15);
  pinheiro(CX+78, CY+132, 0.9);

  // montinhos de neve, pedras cobertas, pegadas e cristais
  espalhar(R, 26, 16, (x,y,R) => {
    const s = 5 + R()*7;
    c.fillStyle = 'rgba(160,196,216,.35)'; ell(c,x,y+2,s,s*0.42); c.fill();
    c.fillStyle = '#ffffff'; ell(c,x,y,s,s*0.62); c.fill();
    c.fillStyle = 'rgba(214,236,247,.9)'; ell(c,x-s*0.25,y+s*0.2,s*0.6,s*0.3); c.fill();
  });
  espalhar(R, 14, 22, (x,y,R) => {
    const s = 6 + R()*5;
    c.fillStyle = '#8f9aa3'; ell(c,x,y+1,s,s*0.6); c.fill();
    c.fillStyle = '#ffffff'; ell(c,x,y-s*0.3,s*0.95,s*0.42); c.fill();
  });
  espalhar(R, 30, 20, (x,y) => {
    c.fillStyle = 'rgba(168,198,216,.5)';
    c.fillRect(x|0, y|0, 2, 3); c.fillRect((x|0)+4, (y|0)+3, 2, 3);
  });
  espalhar(R, 46, 12, (x,y) => {
    c.fillStyle = 'rgba(255,255,255,.9)';
    c.fillRect(x|0,(y|0)-1,1,3); c.fillRect((x|0)-1,y|0,3,1);
  });
}
function marGelado(t){
  map.fillStyle = '#274b74'; map.fillRect(0,0,W,H);
  map.fillStyle = '#1f3d63';
  for (let y=0; y<H; y+=10) map.fillRect(0, y + ((t*3)%10|0), W, 4);
  // placas de gelo boiando ao redor
  map.fillStyle = 'rgba(214,236,247,.5)';
  for (let k=0;k<7;k++){
    const a = k*0.9 + t*0.06, rr = 1.10 + (k%3)*0.05;
    const e2 = 2/NSHAPE, ct = Math.cos(a), st = Math.sin(a);
    ell(map, CX + SAND_RX*rr*Math.sign(ct)*Math.pow(Math.abs(ct),e2),
             CY + SAND_RY*rr*Math.sign(st)*Math.pow(Math.abs(st),e2), 13, 7); map.fill();
  }
  map.strokeStyle = 'rgba(226,244,253,.8)'; map.lineWidth = 3;
  isle(map, CX, CY, SAND_RX+2, SAND_RY+2); map.stroke();
  map.strokeStyle = 'rgba(255,255,255,.25)'; map.lineWidth = 2;
  isle(map, CX, CY, SAND_RX+8+Math.sin(t*0.8)*2, SAND_RY+8+Math.sin(t*0.8)*2); map.stroke();
}

/* ---------------------------------------------------------------- 3
   COLISEU — pedra, emblema, colunas e estátuas                       */
function coliseu(c){
  piso(c, '#8d7f6a', '#7d7060');
  miolo(c, '#d9c9a6', '#e6d7b6');
  const R = rng(20260902);

  // ladrilhos + desgaste, recortados no miolo
  c.save(); isle(c,CX,CY,GRASS_RX,GRASS_RY); c.clip();
  c.strokeStyle = 'rgba(150,130,96,.5)'; c.lineWidth = 1;
  for (let y=CY-GRASS_RY; y<CY+GRASS_RY; y+=17){
    c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke();
    const off = (((y-CY)/17)|0) % 2 ? 22 : 0;
    for (let x=CX-GRASS_RX+off; x<CX+GRASS_RX; x+=44){
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+17); c.stroke();
    }
  }
  for (let i=0;i<70;i++){
    const x = CX+(R()*2-1)*GRASS_RX, y = CY+(R()*2-1)*GRASS_RY;
    c.fillStyle = R()<.5 ? 'rgba(120,104,78,.18)' : 'rgba(255,246,220,.22)';
    ell(c,x,y, 5+R()*16, 3+R()*9); c.fill();
  }
  c.restore();

  // emblema central
  c.save(); c.translate(CX,CY);
  c.strokeStyle = 'rgba(120,102,72,.55)'; c.lineWidth = 3;
  c.beginPath(); c.arc(0,0,30,0,Math.PI*2); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.arc(0,0,22,0,Math.PI*2); c.stroke();
  c.fillStyle = 'rgba(120,102,72,.35)';
  c.beginPath(); c.arc(0,0,9,Math.PI,0); c.fill();
  c.fillRect(-30,-1.5,60,3);
  for (let k=0;k<8;k++){
    c.save(); c.rotate(k*Math.PI/4); c.fillRect(24,-1.5,7,3); c.restore();
  }
  c.restore();

  // colunas nas laterais
  const coluna = (x,y,h) => {
    c.fillStyle = 'rgba(0,0,0,.20)'; ell(c,x,y+h/2+3,13,5); c.fill();
    c.fillStyle = '#b9a785'; c.fillRect(x-10, y-h/2, 20, h);
    c.fillStyle = '#d6c6a4'; c.fillRect(x-8, y-h/2, 11, h);
    c.fillStyle = '#a08e6d'; c.fillRect(x+4, y-h/2, 6, h);
    c.fillStyle = '#e8dabb'; c.fillRect(x-13, y-h/2-6, 26, 8);
    c.fillStyle = '#c9b795'; c.fillRect(x-13, y+h/2-2, 26, 8);
    for (let k=1;k<5;k++){ c.fillStyle='rgba(120,102,72,.25)';
      c.fillRect(x-8, y-h/2 + k*h/5, 16, 1); }
  };
  coluna(CX-118, CY-70, 76); coluna(CX-118, CY+70, 76);
  coluna(CX+118, CY-70, 76); coluna(CX+118, CY+70, 76);

  /* Estátuas de pedra nos cantos. São SILHUETAS genéricas — ave de asas
     abertas e fera sentada — e não uma espécie do elenco: o motor é agnóstico
     ao tema e o cenário também deve ser. Estátua do favorito seria conteúdo do
     ContentPack vazando para dentro do render. */
  const estatuaAve = (x,y,esp) => {
    c.save(); c.translate(x,y); c.scale(esp,1);
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c,0,17,15,5); c.fill();
    c.fillStyle = '#9d8e73'; c.fillRect(-13,10,26,7);
    c.fillStyle = '#b3a488'; c.fillRect(-10,4,20,7);
    c.fillStyle = '#c9bb9d';
    c.beginPath(); c.moveTo(0,-16); c.lineTo(8,2); c.lineTo(-8,2); c.fill();
    c.beginPath(); c.moveTo(-6,-8); c.lineTo(-20,-16); c.lineTo(-7,0); c.fill();
    c.beginPath(); c.moveTo(6,-8); c.lineTo(20,-16); c.lineTo(7,0); c.fill();
    c.fillStyle = '#8d7f66'; c.fillRect(-2,-20,4,5);
    c.restore();
  };
  const estatuaFera = (x,y,esp) => {
    c.save(); c.translate(x,y); c.scale(esp,1);
    c.fillStyle = 'rgba(0,0,0,.22)'; ell(c,0,17,14,5); c.fill();
    c.fillStyle = '#9d8e73'; c.fillRect(-12,10,24,7);
    c.fillStyle = '#c9bb9d'; ell(c,0,0,10,12); c.fill();
    c.fillStyle = '#d7caae'; ell(c,0,-11,7,6); c.fill();
    c.fillStyle = '#c9bb9d';
    c.beginPath(); c.moveTo(-7,-14); c.lineTo(-4,-21); c.lineTo(-1,-14); c.fill();
    c.beginPath(); c.moveTo(7,-14); c.lineTo(4,-21); c.lineTo(1,-14); c.fill();
    c.fillStyle = '#8d7f66'; c.fillRect(-8,6,4,7); c.fillRect(4,6,4,7);
    c.restore();
  };
  estatuaAve(CX-92, CY-140, 1); estatuaAve(CX+92, CY-140, -1);
  estatuaFera(CX-92, CY+142, 1); estatuaFera(CX+92, CY+142, -1);

  // rachaduras
  for (let i=0;i<9;i++){
    const p = naBorda(R, 0.35 + R()*0.5);
    c.strokeStyle = 'rgba(110,94,68,.45)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(p.x,p.y);
    let x=p.x, y=p.y;
    for (let k=0;k<4;k++){ x += (R()*2-1)*16; y += (R()*2-1)*16; c.lineTo(x,y); }
    c.stroke();
  }
  // areia arrastada
  espalhar(R, 120, 8, (x,y,R) => {
    c.fillStyle = R()<.5 ? 'rgba(196,176,136,.35)' : 'rgba(246,236,208,.3)';
    c.fillRect(x|0,y|0, 2+(R()*3|0), 1);
  });
}
function pedraColiseu(t){
  map.fillStyle = '#3a3226'; map.fillRect(0,0,W,H);
  map.fillStyle = '#332b21';
  for (let y=0; y<H; y+=14) map.fillRect(0, y, W, 6);
  // arquibancada sugerida
  for (let k=0;k<5;k++){
    isle(map, CX, CY, SAND_RX+8+k*11, SAND_RY+8+k*11);
    map.lineWidth = 6;
    map.strokeStyle = k%2 ? 'rgba(104,90,66,.55)' : 'rgba(78,66,48,.55)';
    map.stroke();
  }
  // tochas piscando ao redor
  for (let k=0;k<8;k++){
    const a = k*Math.PI/4 + 0.4, e2 = 2/NSHAPE;
    const ct = Math.cos(a), st = Math.sin(a);
    const x = CX + (SAND_RX+6)*Math.sign(ct)*Math.pow(Math.abs(ct),e2);
    const y = CY + (SAND_RY+6)*Math.sign(st)*Math.pow(Math.abs(st),e2);
    const f = 0.6 + Math.sin(t*6 + k*1.7)*0.25;
    map.fillStyle = `rgba(255,170,60,${0.30*f})`; ell(map,x,y,13,13); map.fill();
    map.fillStyle = `rgba(255,226,140,${0.85*f})`; ell(map,x,y,3.4,4.6); map.fill();
  }
  map.strokeStyle = 'rgba(232,218,187,.85)'; map.lineWidth = 3;
  isle(map, CX, CY, SAND_RX+2, SAND_RY+2); map.stroke();
}

/* ---------------------------------------------------------------- 4
   PRAIA — castelo de areia, estrelas-do-mar e espuma na costa        */
function praiaAreia(c){
  piso(c, '#e8cf93', '#dcc184');
  miolo(c, '#f2dfae', '#f7e8c0');
  const R = rng(20260903);

  // areia molhada perto da borda
  c.save(); isle(c,CX,CY,GRASS_RX,GRASS_RY); c.clip();
  c.globalAlpha = .35;
  for (let k=0;k<3;k++){ c.strokeStyle = '#cbae74'; c.lineWidth = 7;
    isle(c,CX,CY,GRASS_RX-2-k*6,GRASS_RY-2-k*6); c.stroke(); }
  c.globalAlpha = 1; c.restore();

  // ondulações da areia
  espalhar(R, 220, 6, (x,y,R) => {
    c.fillStyle = R()<.5 ? 'rgba(206,178,120,.45)' : 'rgba(252,240,205,.5)';
    c.fillRect(x|0, y|0, 4+(R()*6|0), 1);
  });

  // castelo de areia
  const cx0 = CX-72, cy0 = CY-96;
  c.fillStyle = 'rgba(0,0,0,.14)'; ell(c,cx0,cy0+16,26,6); c.fill();
  const torre = (x,y,w,h) => {
    c.fillStyle = '#d9b878'; c.fillRect(x-w/2, y-h, w, h);
    c.fillStyle = '#eed9a6'; c.fillRect(x-w/2, y-h, w*0.55, h);
    c.fillStyle = '#c9a464'; c.fillRect(x-w/2, y-3, w, 3);
    c.fillStyle = '#e5cd97';
    for (let k=0;k<3;k++) c.fillRect(x-w/2 + k*(w/3), y-h-4, w/3-1.5, 4);
    c.fillStyle = '#8a6b3c'; c.fillRect(x-1.5, y-h*0.55, 3, 4);
  };
  c.fillStyle = '#d3b06f'; c.fillRect(cx0-24, cy0+4, 48, 12);
  c.fillStyle = '#ecd7a2'; c.fillRect(cx0-24, cy0+4, 48, 4);
  torre(cx0-17, cy0+6, 13, 20); torre(cx0+17, cy0+6, 13, 20); torre(cx0, cy0+6, 16, 30);
  c.fillStyle = '#e05a4a'; c.fillRect(cx0-0.7, cy0-30, 1.4, 9);   // bandeirinha
  c.beginPath(); c.moveTo(cx0+0.7,cy0-30); c.lineTo(cx0+9,cy0-27); c.lineTo(cx0+0.7,cy0-24); c.fill();

  // estrelas-do-mar
  const estrela = (x,y,s,col) => {
    c.save(); c.translate(x,y); c.fillStyle = col; c.beginPath();
    for (let k=0;k<10;k++){
      const a = -Math.PI/2 + k*Math.PI/5, r = k%2 ? s*0.42 : s;
      c[k?'lineTo':'moveTo'](Math.cos(a)*r, Math.sin(a)*r);
    }
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; ell(c,0,0,s*0.3,s*0.3); c.fill();
    c.restore();
  };
  estrela(CX+86, CY+64, 9, '#e8734f');
  estrela(CX-96, CY+130, 7.5, '#e0a03e');
  estrela(CX+56, CY-146, 7, '#dd5f7a');

  // conchinhas e algas
  espalhar(R, 34, 12, (x,y,R) => {
    const s = 3 + R()*2.5;
    c.fillStyle = ['#f6e6d0','#f0c9b6','#e8d5b0','#f7dcc4'][R()*4|0];
    c.beginPath(); c.arc(x,y,s,Math.PI,0); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(180,140,110,.55)'; c.lineWidth = .8;
    for (let k=1;k<4;k++){ c.beginPath(); c.arc(x,y,s*k/4,Math.PI,0); c.stroke(); }
  });
  espalhar(R, 16, 22, (x,y,R) => {
    c.strokeStyle = 'rgba(70,120,80,.6)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x,y);
    c.quadraticCurveTo(x+(R()*2-1)*8, y-7, x+(R()*2-1)*10, y-13); c.stroke();
  });

  // coqueiros
  const coqueiro = (x,y) => {
    c.fillStyle='rgba(0,0,0,.16)'; ell(c,x,y+3,11,4); c.fill();
    c.fillStyle='#8a6236'; c.fillRect(x-2,y-26,4,28);
    c.fillStyle='#a37a48'; c.fillRect(x-2,y-26,2,28);
    c.fillStyle='#2f8a4a';
    for (const [dx,dy] of [[-1,-1],[1,-1],[-1.2,.2],[1.2,.2]]){
      c.beginPath(); c.moveTo(x,y-27);
      c.quadraticCurveTo(x+dx*16, y-33+dy*4, x+dx*22, y-24+dy*6);
      c.quadraticCurveTo(x+dx*14, y-27+dy*3, x, y-25); c.fill();
    }
    c.fillStyle='#6b4a24'; ell(c,x-3,y-24,2.2,2.2); c.fill(); ell(c,x+3,y-23,2.2,2.2); c.fill();
  };
  coqueiro(CX+104, CY-108); coqueiro(CX-108, CY-40);
}
function marPraia(t){
  map.fillStyle = '#1f5fbe'; map.fillRect(0,0,W,H);
  map.fillStyle = '#1a51a3';
  for (let y=0; y<H; y+=7) map.fillRect(0, y + ((t*9)%7|0), W, 3);
  map.fillStyle = 'rgba(120,220,235,.35)';
  for (let y=0; y<H; y+=11) map.fillRect(0, y + ((t*5)%11|0), W, 2);
  // espuma batendo na costa — frentes em ritmos diferentes
  for (let k=0;k<9;k++){
    const g = 3 + k*9 + (t*9 + k*2) % 15;
    map.strokeStyle = `rgba(255,255,255,${0.34 - k*0.032})`;
    map.lineWidth = k < 3 ? 3 : 2;
    isle(map, CX, CY, SAND_RX+g, SAND_RY+g); map.stroke();
  }
  const pulso = 2 + Math.sin(t*1.6)*1.6;
  map.strokeStyle = 'rgba(255,255,255,.9)'; map.lineWidth = 4;
  isle(map, CX, CY, SAND_RX+pulso, SAND_RY+pulso); map.stroke();
  map.strokeStyle = 'rgba(214,246,255,.5)'; map.lineWidth = 2;
  isle(map, CX, CY, SAND_RX+pulso+5, SAND_RY+pulso+5); map.stroke();
}

/* ---------------------------------------------------------------- 5
   CRATERA VULCÂNICA — rocha escura, rachaduras de lava e mini vulcão */
function crateraVulcao(c){
  piso(c, '#2e2320', '#251c1a');
  miolo(c, '#3a2d29', '#463632');
  const R = rng(20260904);

  espalhar(R, 60, 10, (x,y,R) => {
    c.fillStyle = R()<.5 ? 'rgba(28,21,19,.55)' : 'rgba(88,68,60,.35)';
    ell(c,x,y, 7+R()*20, 5+R()*12); c.fill();
  });
  espalhar(R, 240, 6, (x,y,R) => {
    c.fillStyle = R()<.5 ? 'rgba(20,15,14,.6)' : 'rgba(110,88,78,.4)';
    c.fillRect(x|0,y|0, 1+(R()*3|0), 1);
  });

  /* Rachaduras em três camadas — base escura, lava, núcleo claro. É o que dá
     o brilho: uma linha só de laranja lê como risco, não como fenda. */
  const rachadura = (x0,y0,x1,y1,esp) => {
    const pts = [[x0,y0]];
    const passos = 7;
    for (let k=1;k<passos;k++){
      pts.push([x0 + (x1-x0)*k/passos + (R()*2-1)*13,
                y0 + (y1-y0)*k/passos + (R()*2-1)*13]);
    }
    pts.push([x1,y1]);
    const traco = (w, col) => {
      c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts) c.lineTo(p[0], p[1]);
      c.stroke();
    };
    traco(esp+3.5, 'rgba(12,8,7,.9)');
    traco(esp+1.6, '#8c2410');
    traco(esp,     '#e2521a');
    traco(esp*0.45,'#ffc24a');
    for (let k=1;k<pts.length-1;k+=2){
      const [px,py] = pts[k];
      const ex = px + (R()*2-1)*24, ey = py + (R()*2-1)*24;
      c.strokeStyle = 'rgba(12,8,7,.85)'; c.lineWidth = esp*0.7+2;
      c.beginPath(); c.moveTo(px,py); c.lineTo(ex,ey); c.stroke();
      c.strokeStyle = '#c9401a'; c.lineWidth = esp*0.6;
      c.beginPath(); c.moveTo(px,py); c.lineTo(ex,ey); c.stroke();
    }
  };
  c.save(); isle(c,CX,CY,GRASS_RX,GRASS_RY); c.clip();
  rachadura(CX-130, CY-150, CX+40,  CY-30, 4.5);
  rachadura(CX+130, CY-90,  CX-20,  CY+60, 4.0);
  rachadura(CX-120, CY+120, CX+110, CY+165, 3.6);
  rachadura(CX+20,  CY-170, CX+70,  CY+20, 3.0);
  c.restore();
  c.lineJoin = 'miter'; c.lineCap = 'butt';

  // poça de lava
  const px0 = CX+62, py0 = CY+92;
  c.fillStyle = 'rgba(10,6,5,.9)'; ell(c,px0,py0,30,20); c.fill();
  c.fillStyle = '#7e1f0d'; ell(c,px0,py0,26,17); c.fill();
  c.fillStyle = '#d9481a'; ell(c,px0,py0,21,13); c.fill();
  c.fillStyle = '#f79127'; ell(c,px0-2,py0-2,14,8); c.fill();
  c.fillStyle = '#ffd66b'; ell(c,px0-4,py0-3,7,4); c.fill();

  // mini vulcão, com lava escorrendo pela encosta
  const vx = CX-86, vy = CY-104;
  c.fillStyle = 'rgba(0,0,0,.3)'; ell(c,vx,vy+18,30,8); c.fill();
  c.fillStyle = '#241a18'; c.beginPath();
  c.moveTo(vx-30,vy+18); c.lineTo(vx-11,vy-16); c.lineTo(vx+11,vy-16); c.lineTo(vx+30,vy+18); c.fill();
  c.fillStyle = '#372824'; c.beginPath();
  c.moveTo(vx-30,vy+18); c.lineTo(vx-11,vy-16); c.lineTo(vx-2,vy-16); c.lineTo(vx-6,vy+18); c.fill();
  c.fillStyle = '#6b2410'; ell(c,vx,vy-16,11,4.5); c.fill();
  c.fillStyle = '#e2521a'; ell(c,vx,vy-16,8,3); c.fill();
  c.fillStyle = '#ffc24a'; ell(c,vx,vy-17,4.5,1.8); c.fill();
  c.strokeStyle = '#c9401a'; c.lineWidth = 2.4; c.lineCap='round';
  c.beginPath(); c.moveTo(vx+4,vy-14); c.lineTo(vx+11,vy+2); c.lineTo(vx+17,vy+17); c.stroke();
  c.strokeStyle = '#ffb03a'; c.lineWidth = 1.1;
  c.beginPath(); c.moveTo(vx+4,vy-14); c.lineTo(vx+11,vy+2); c.lineTo(vx+17,vy+17); c.stroke();
  c.lineCap='butt';

  // pedras incandescentes
  espalhar(R, 22, 18, (x,y,R) => {
    const s = 4+R()*4;
    c.fillStyle = '#1a1210'; ell(c,x,y,s,s*0.7); c.fill();
    c.fillStyle = 'rgba(226,82,26,.55)'; ell(c,x,y-s*0.2,s*0.55,s*0.3); c.fill();
  });
}
function bordaVulcao(t){
  map.fillStyle = '#150e0d'; map.fillRect(0,0,W,H);
  const pulso = 0.5 + Math.sin(t*1.3)*0.5;
  map.fillStyle = `rgba(120,32,12,${0.55 + pulso*0.2})`; map.fillRect(0,0,W,H);
  map.fillStyle = '#0d0807';
  for (let y=0; y<H; y+=12) map.fillRect(0, y + ((t*4)%12|0), W, 7);
  for (let k=6;k>=0;k--){
    const g = 4 + k*10;
    map.strokeStyle = `rgba(255,${110+k*12},${30+k*8},${0.28 - k*0.03})`;
    map.lineWidth = 4;
    isle(map, CX, CY, SAND_RX+g, SAND_RY+g); map.stroke();
  }
  map.strokeStyle = `rgba(255,190,80,${0.55+pulso*0.35})`; map.lineWidth = 3;
  isle(map, CX, CY, SAND_RX+2, SAND_RY+2); map.stroke();
  // brasas subindo
  for (let k=0;k<14;k++){
    const a = (k*2.4 + t*0.4) % (Math.PI*2), e2 = 2/NSHAPE;
    const ct = Math.cos(a), st = Math.sin(a);
    const sobe = ((t*22 + k*17) % 60);
    const x = CX + (SAND_RX+7)*Math.sign(ct)*Math.pow(Math.abs(ct),e2);
    const y = CY + (SAND_RY+7)*Math.sign(st)*Math.pow(Math.abs(st),e2) - sobe*0.5;
    map.fillStyle = `rgba(255,${150+((k*23)%80)},60,${0.7*(1-sobe/60)})`;
    map.fillRect(x|0, y|0, 2, 2);
  }
}

/* A pintura de cada chave do catálogo. O teste `test/arenas.mjs` exige que as
   duas listas fechem nos dois sentidos: chave sem pintura abre a rodada com a
   arena em branco, pintura sem chave é código morto que ninguém alcança. */
const PINTURA = {
  tropical: { estatico: ilhaTropical,   fundo: marTropical  },
  neve:     { estatico: campoNeve,      fundo: marGelado    },
  coliseu:  { estatico: coliseu,        fundo: pedraColiseu },
  praia:    { estatico: praiaAreia,     fundo: marPraia     },
  vulcao:   { estatico: crateraVulcao,  fundo: bordaVulcao  },
};

let atual = null;

/* Aplica a arena: repinta a camada estática e acende o selo.
 *
 * O selo aparece JÁ NA FASE DE APOSTA, ao contrário do de clima. A diferença
 * não é de estilo: o clima dá bônus de stat e fica em segredo até as apostas
 * fecharem (§4.3); a arena não dá nada, então escondê-la só tiraria da tela
 * uma informação que não muda preço nenhum. */
function aplicarArena(a){
  atual = a;
  aplicarCenario({ ...PINTURA[a.key], poeira: a.poeira });
  /* O VÉU DE COR (L-027). Uma camada só, por cima de TUDO — chão, lutadores e
     efeitos — porque unidade que não alcança o lutador não é unidade: é um
     filtro no fundo com o decalque continuando decalque em cima dele.
     Por isso é CSS no `#arena` e não pintura no canvas do mapa. */
  const arena = $('#arena');
  if (arena && a.brilho){
    arena.style.setProperty('--veuCor', a.brilho);
    arena.style.setProperty('--veuAlfa', String(a.veu ?? 0));
    arena.style.setProperty('--veuMistura', a.mistura || 'soft-light');
  }
  const b = $('#arenaBadge');
  if (b){
    b.innerHTML = `${a.emoji} <b style="display:inline">${a.nome}</b>`;
    b.classList.add('show');
  }
}

/* A arena da rodada, do sorteio à tela, num passo só — para que não exista o
   caminho de sortear sem aplicar (ou aplicar sem sortear, que foi como o
   defeito S30 passou). */
function arenaDaRodada(sementeVisual){
  const a = sortearArena(sementeVisual);
  aplicarArena(a);
  return a;
}

const arenaAtual = () => atual;

export {
  ARENAS,
  aplicarArena,
  arenaAtual,
  arenaDaRodada,
};
