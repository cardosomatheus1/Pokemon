/* Q1 · A POSSE QUE A TELA LÊ (E4 · metade B, ST-4.2 a 4.4 no cliente).
 *
 * Com conta real a posse é a do SERVIDOR; sem conta, a do navegador, como
 * sempre. Este arquivo trava as quatro decisões que a tela deixou de tomar
 * sozinha — elas moram em `posse-atual.mjs`, camada 0, e a tela pinta:
 *
 *   de onde vem a posse          servidor quando hidratado; local senão
 *   o que pode ser equipado      o do catálogo exige posse; o resto é livre
 *   qual peça cada clique é      o `data-*` da grade vira (família, id)
 *   o que o servidor equipou     volta para o perfil no login, em qualquer aparelho
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { posseAtual, adotarDoServidor, podeEquipar, escolhaDoCosmetico, aplicarEquipados,
         hidratarPosse } from '../app/modules/posse-atual.mjs';
import { catalogo, posseInicial } from '../app/modules/cosmeticos.mjs';
import * as acervo from '../app/modules/outfit-acervo.mjs';

const fonte = f => readFileSync(new URL(f, import.meta.url), 'utf8');
const semDeposito = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const loja = fam => catalogo().find(p => p.familia === fam && p.procedencia === 'loja');
const padrao = fam => catalogo().find(p => p.familia === fam && p.procedencia === 'padrao');

export function suite() {
  const s = criarSuite('posse-atual');

  s.teste('sem servidor a posse é a do navegador; hidratada, é a do servidor', () => {
    adotarDoServidor(null);
    igual(posseAtual(semDeposito).join(','), posseInicial().join(','), 'sem servidor a posse não é a local');
    adotarDoServidor({ posse: ['cena:x'], equipados: {} });
    igual(posseAtual(semDeposito).join(','), 'cena:x', 'hidratada, a tela continuou lendo o navegador');
    adotarDoServidor(null);
  });

  s.teste('a base de graça é só o padrão — o que se ganha por missão não sai de graça', () => {
    const cat = [{ familia: 'cena', id: 'p', procedencia: 'padrao' },
                 { familia: 'cena', id: 'm', procedencia: 'missao' },
                 { familia: 'cena', id: 'f', procedencia: 'fragmento' },
                 { familia: 'cena', id: 'l', procedencia: 'loja' }];
    igual(posseInicial(cat).join(','), 'cena:p',
      'a base de graça deu peça de missão ou de fragmento — o defeito latente que o mapa do E4 achou');
  });

  s.teste('equipar: o do catálogo exige posse; o que não é do catálogo é livre; NPC nunca', () => {
    const posse = [`cena:${padrao('cena').id}`];
    ok(podeEquipar(catalogo(), posse, 'cena', padrao('cena').id), 'não deixou equipar o que possui');
    igual(podeEquipar(catalogo(), posse, 'cena', loja('cena').id), false, 'deixou equipar peça da loja sem ter');
    ok(podeEquipar(catalogo(), [...posse, `cena:${loja('cena').id}`], 'cena', loja('cena').id), 'comprou e não pôde equipar');
    ok(podeEquipar(catalogo(), [], 'avatar', null), 'a criatura como retrato (fora do catálogo) foi barrada');
    ok(podeEquipar(catalogo(), [], null, null), 'escolha sem família foi barrada');
    igual(podeEquipar([{ familia: 'outfit', id: 'n', procedencia: 'npc' }], ['outfit:n'], 'outfit', 'n'), false,
      'a roupa de NPC foi vestida — ela nunca é do jogador');
  });

  s.teste('o clique da grade vira (família, id) — e o que não é do catálogo vira id nulo', () => {
    igual(JSON.stringify(escolhaDoCosmetico({ av: 'galeria', id: 'g1' })), '{"familia":"avatar","id":"g1"}', 'galeria');
    igual(JSON.stringify(escolhaDoCosmetico({ av: 'trainer', id: 't1' })), '{"familia":"avatar","id":"t1"}', 'treinador');
    igual(JSON.stringify(escolhaDoCosmetico({ av: 'mon', id: '25' })), '{"familia":"avatar","id":null}', 'criatura');
    igual(JSON.stringify(escolhaDoCosmetico({ av: 'arte', id: 'a' })), '{"familia":"avatar","id":null}', 'arte');
    igual(JSON.stringify(escolhaDoCosmetico({ bcena: 'c' })), '{"familia":"cena","id":"c"}', 'cena');
    igual(JSON.stringify(escolhaDoCosmetico({ befeito: 'e' })), '{"familia":"efeito","id":"e"}', 'efeito');
    igual(JSON.stringify(escolhaDoCosmetico({ bmoldura: 'm' })), '{"familia":"moldura","id":"m"}', 'moldura');
    igual(escolhaDoCosmetico({ bmon: '25' }), null, 'o Pokémon do banner não é cosmético do catálogo');
  });

  s.teste('o que o servidor equipou volta para o perfil — em qualquer aparelho', () => {
    const galeria = loja('avatar').id, treinador = padrao('avatar').id;
    const p = aplicarEquipados({ avatar: { kind: 'mon', id: 25 }, battle: { cena: 'x' } },
                               { avatar: galeria, cena: 'nova', moldura: 'm2' });
    igual(p.avatar.kind, 'galeria', 'o avatar da galeria voltou com outro tipo');
    igual(p.avatar.id, galeria, 'o avatar equipado não voltou');
    igual(p.battle.cena, 'nova', 'a cena equipada não voltou');
    igual(p.battle.moldura, 'm2', 'a moldura equipada não voltou');
    igual(aplicarEquipados({ avatar: {} }, { avatar: treinador }).avatar.kind, 'trainer', 'o treinador voltou com outro tipo');
    const semNada = aplicarEquipados({ avatar: { kind: 'mon', id: 25 } }, {});
    igual(semNada.avatar.kind, 'mon', 'sem avatar no servidor, o retrato local (fora do catálogo) foi apagado');
  });

  s.teste('ST-4.4: com servidor, o traje segue a posse dele — o MODO_VITRINE não vale', () => {
    const [um, dois] = acervo.ACERVO.filter(o => o.procedencia !== 'npc');
    adotarDoServidor({ posse: [`outfit:${um.id}`], equipados: {} });
    ok(acervo.tem({ posse: [] }, um.id), 'o traje possuído no servidor não é vestível');
    igual(acervo.tem({ posse: [dois.id] }, dois.id), false,
      'com servidor, um traje fora da posse DELE foi vestível — o MODO_VITRINE ou a posse local vazou');
    ok(acervo.bloqueados({ posse: [] }).some(o => o.id === dois.id), 'o traje fora da posse do servidor não aparece trancado');
    adotarDoServidor(null);
    igual(acervo.tem({ posse: [] }, dois.id), acervo.MODO_VITRINE, 'sem servidor, o traje deixou de seguir o modo local');
  });

  s.teste('hidratar pergunta ao servidor e adota; sem resposta, fica o local', async () => {
    adotarDoServidor(null);
    const r = await hidratarPosse({ get: async () => ({ ok: true, corpo: { posse: ['moldura:z'], equipados: { moldura: 'z' } } }) });
    ok(r.ok, 'a hidratação não devolveu o resultado');
    igual(posseAtual(semDeposito).join(','), 'moldura:z', 'a posse do servidor não foi adotada');
    adotarDoServidor(null);
    await hidratarPosse({ get: async () => ({ ok: false, indisponivel: true }) });
    igual(posseAtual(semDeposito).join(','), posseInicial().join(','), 'sem servidor a posse virou vazia em vez de local');
  });

  s.teste('a tela passa pela decisão: equipar confere, a boutique cobra no servidor, o login hidrata', () => {
    const cust = fonte('../app/modules/customizacao.mjs');
    const handler = cust.slice(cust.indexOf("$('#profileModal').addEventListener('click'"));
    ok(/if \(escolha && !podeEquipar\(/.test(handler.slice(0, 2500)),
      'o clique da customização equipa sem perguntar à posse — equipar de graça volta');
    const loja = fonte('../app/modules/loja-cash.mjs');
    const compra = loja.slice(loja.indexOf('export function comprarPeca'), loja.indexOf('let ligado'));
    ok(/modoServidor\(\)/.test(compra) && /comprarNoServidor\(/.test(compra),
      'com conta real a compra não vai ao servidor — é o D-108 de volta');
    ok(compra.indexOf('comprarNoServidor(') < compra.indexOf('gastarEmCosmetico('),
      'a compra debita a carteira LOCAL antes de decidir ir ao servidor');
    ok(/hidratarPosse\(/.test(fonte('../app/modules/perfil-dados.mjs')),
      'o login não hidrata a posse — limpar o navegador perde o que foi comprado (L-055)');
    ok(/let lerPosse = \(\) => posseAtual\(\)/.test(loja),
      'a boutique não lê a posse que vale agora — com conta real ela leria o navegador');
    ok(!/ler:\s*\(\)\s*=>\s*carregarPosse/.test(fonte('../app/modules/idle-tela.mjs')),
      'o idle voltou a injetar a posse do NAVEGADOR na boutique');
  });

  return s;
}
