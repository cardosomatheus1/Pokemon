/* Clima — partículas, tingimento do chão e o selo de canto.
 *
 * Fronteira: puramente visual. O clima que ALTERA a batalha vive no motor; aqui
 * só existe a encenação dele.
 */

import { S } from './estado.mjs';
import { $ } from './dom.mjs';
import { enfeite } from './sorte.mjs';
import { H, W, fx, map } from './render.mjs';

/* =====================================================================
   CLIMA DA ARENA
   ---------------------------------------------------------------------
   O clima só é sorteado DEPOIS que as apostas fecham — na hora em que a
   partida realmente começa (transição apostas -> contagem). É por isso
   que as odds mostradas durante a fase de apostas NÃO conhecem o clima:
   elas saem de um Monte Carlo rodado sobre os stats crus, sem bônus
   climático nenhum. O clima é revelado junto com a contagem regressiva,
   como um fator surpresa — mais parecido com "chove no dia do jogo" do
   que com uma informação disponível na hora de apostar.

   Isso é intencional, não uma falha: o resultado real da luta PODE
   divergir da distribuição que gerou as odds, porque o clima entra
   depois. É a mesma dinâmica de qualquer aposta esportiva ao ar livre.
   ===================================================================== */



/* Devolve uma CÓPIA do elenco com ATK/SpA ou Velocidade ajustados para
   quem bate com o tipo do clima. maxHp, defesas, golpes e tudo mais
   continuam iguais — só a ofensiva/velocidade muda. */

function showWeatherBadge(weather){
  const el = $('#weatherBadge');
  const afetados = weather.type ? S.fighters.filter(f=>f.types.includes(weather.type)).map(f=>f.n) : [];
  el.innerHTML = `<b>${weather.emoji} ${weather.name}</b><span>${weather.desc}</span>`;
  el.title = afetados.length ? 'Favorecidos: ' + afetados.join(', ') : '';
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('show','pop');
}
function hideWeatherBadge(){ $('#weatherBadge').classList.remove('show','pop'); }

/* =====================================================================
   EFEITOS VISUAIS DO CLIMA
   ---------------------------------------------------------------------
   O selo no canto avisa qual clima caiu, mas sozinho é fácil de não
   notar. Aqui cada clima ganha:
     1) um véu de cor sobre o chão (desenhado em drawMap, por baixo dos
        sprites — os Pokémon continuam legíveis por cima)
     2) partículas animadas por cima de tudo (desenhadas em drawFx —
        chuva/neve/vento caem/voam NA FRENTE dos lutadores, como na vida
        real) — exceto o Sol, que é só luz (vinheta quente + raios).

   As partículas vivem num pool fixo, reciclado: em vez de nascer e
   morrer (push/splice o jogo inteiro), cada uma volta pro início assim
   que sai da tela. Mais barato e não falta partícula no meio da luta.
   ===================================================================== */
let weatherParticles = [];
let weatherKind = null;   // 'sol' | 'chuva' | 'vento' | 'neve' | null (Neutro)

function initWeatherFx(w){
  weatherKind = (w && w.type) ? w.key : null;
  weatherParticles = [];
  if (weatherKind === 'chuva'){
    for (let i=0;i<70;i++) weatherParticles.push({
      x: enfeite()*W, y: enfeite()*H,
      len: 7+enfeite()*7, spd: 260+enfeite()*130,
    });
  } else if (weatherKind === 'neve'){
    for (let i=0;i<55;i++) weatherParticles.push({
      x: enfeite()*W, y: enfeite()*H,
      r: 1+enfeite()*1.6, spd: 16+enfeite()*20,
      sway: enfeite()*Math.PI*2, swaySpd: 1+enfeite()*1.4,
    });
  } else if (weatherKind === 'vento'){
    for (let i=0;i<24;i++) weatherParticles.push({
      x: enfeite()*W, y: enfeite()*H,
      len: 20+enfeite()*32, spd: 190+enfeite()*150,
      wobble: enfeite()*Math.PI*2,
    });
  } else if (weatherKind === 'sol'){
    // raios: nascem FORA do canto superior esquerdo e cruzam a ilha na
    // diagonal (ângulo medido a partir do eixo X, sentido horário)
    for (let i=0;i<6;i++) weatherParticles.push({
      ray:true, ang: 0.30 + i*0.15, phase: enfeite()*Math.PI*2,
    });
    // glints: pontinhos de brilho piscando na grama, tipo sol batendo
    for (let i=0;i<16;i++) weatherParticles.push({
      ray:false, x: 20+enfeite()*(W-40), y: 60+enfeite()*(H-120),
      phase: enfeite()*Math.PI*2, spd: 1.2+enfeite()*1.6,
    });
  }
}

// véu de cor sobre o chão — chamado de dentro de drawMap, depois de
// tudo o mais (fica por cima da ilha e das sombras, embaixo dos sprites
// porque os sprites são elementos DOM numa camada acima do canvas)
function drawWeatherGround(){
  if (!weatherKind) return;
  if (weatherKind === 'sol'){
    map.fillStyle = 'rgba(255,185,70,.14)'; map.fillRect(0,0,W,H);
  } else if (weatherKind === 'chuva'){
    map.fillStyle = 'rgba(35,55,100,.20)'; map.fillRect(0,0,W,H);
  } else if (weatherKind === 'vento'){
    map.fillStyle = 'rgba(210,225,215,.05)'; map.fillRect(0,0,W,H);
  } else if (weatherKind === 'neve'){
    map.fillStyle = 'rgba(222,236,255,.18)'; map.fillRect(0,0,W,H);
  }
}

// partículas + luz — chamado de dentro de drawFx, por cima de tudo
function drawWeatherFx(dt, time){
  if (weatherKind === 'chuva'){
    const dirX = -0.32, dirY = 0.95;   // quase vertical, cai puxando pra esquerda
    fx.strokeStyle = 'rgba(210,230,255,.55)'; fx.lineWidth = 1.3;
    for (const p of weatherParticles){
      p.y += p.spd*dt; p.x += p.spd*dt*(dirX/dirY);
      if (p.y > H+20){ p.y = -20; p.x = enfeite()*W; }
      fx.beginPath();
      fx.moveTo(p.x, p.y);
      fx.lineTo(p.x - dirX*p.len, p.y - dirY*p.len);
      fx.stroke();
    }
  } else if (weatherKind === 'neve'){
    fx.fillStyle = 'rgba(255,255,255,.88)';
    for (const p of weatherParticles){
      p.y += p.spd*dt; p.sway += p.swaySpd*dt;
      const x = p.x + Math.sin(p.sway)*10;
      if (p.y > H+5){ p.y = -5; p.x = enfeite()*W; }
      fx.beginPath(); fx.arc(x, p.y, p.r, 0, Math.PI*2); fx.fill();
    }
  } else if (weatherKind === 'vento'){
    fx.strokeStyle = 'rgba(255,255,255,.5)'; fx.lineWidth = 1.4;
    for (const p of weatherParticles){
      p.x += p.spd*dt; p.wobble += dt*3;
      const y = p.y + Math.sin(p.wobble)*4;
      if (p.x - p.len > W){ p.x = -p.len - enfeite()*60; p.y = enfeite()*H; }
      fx.beginPath();
      fx.moveTo(p.x, y);
      fx.lineTo(p.x - p.len, y - 3);
      fx.stroke();
    }
  } else if (weatherKind === 'sol'){
    // vinheta quente saindo do canto — origem BEM de fora da tela, senão
    // o brilho concentra num cantinho minúsculo e some
    const x0 = -40, y0 = -40;
    const g = fx.createRadialGradient(x0,y0,20, x0,y0,W*1.15);
    g.addColorStop(0, 'rgba(255,220,120,.55)');
    g.addColorStop(1, 'rgba(255,220,120,0)');
    fx.fillStyle = g; fx.fillRect(0,0,W,H);

    fx.save();
    fx.globalCompositeOperation = 'lighter';
    for (const p of weatherParticles){
      if (p.ray){
        // raio: uma faixa larga cruzando a ilha na diagonal, pulsando
        const a = 0.10 + 0.07*Math.sin(time*0.6 + p.phase);
        fx.strokeStyle = `rgba(255,240,190,${a})`; fx.lineWidth = 26;
        fx.beginPath(); fx.moveTo(x0,y0);
        fx.lineTo(x0+Math.cos(p.ang)*620, y0+Math.sin(p.ang)*620);
        fx.stroke();
      } else {
        // glint: brilho piscando na grama, como sol reluzindo
        const a = Math.max(0, Math.sin(time*p.spd + p.phase));
        if (a < 0.55) continue;
        const s = (a-0.55)/0.45;               // 0..1 só no pico do brilho
        fx.fillStyle = `rgba(255,255,235,${s*0.9})`;
        fx.fillRect(p.x-1, p.y-3*s, 2, 6*s);
        fx.fillRect(p.x-3*s, p.y-1, 6*s, 2);
      }
    }
    fx.restore();
  }
}

export {
  drawWeatherFx,
  drawWeatherGround,
  hideWeatherBadge,
  initWeatherFx,
  showWeatherBadge,
};
