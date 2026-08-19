/* Q1/Q6 · SHINY — desbloqueio por nível, equipado à parte, e sem inventar vaga.
 *
 * O cosmético não vale dinheiro nem muda batalha, então o risco aqui não é
 * economia: é o jogador PERDER uma conquista sem aviso. Vaga gasta em
 * duplicata, vaga que aparece do nada, cosmético que some ao desequipar — os
 * três falham em silêncio e só se percebe dias depois.
 *
 * A FONTE É DECISÃO DO BLOCO e está declarada em `shiny-dados.mjs`: nível do
 * treinador, com escolha do jogador. Estes testes afirmam a regra escolhida,
 * para que trocá-la depois seja uma decisão visível e não um deslize.
 */
import { criarSuite, ok, igual } from './harness.mjs';
import {
  NIVEIS_POR_VAGA, SHINY_PMD, SHINY_VAZIO, alternar, desbloquear,
  gifShinyAtivo, skinShinyAtiva, vagasLivres, vagasNoNivel, vagasUsadas,
} from '../app/modules/shiny-dados.mjs';

const perfilNovo = () => ({ shiny: { gifs: [], skins: [], onGif: {}, onSkin: {} } });

export function suite() {
  const s = criarSuite('shiny');

  s.teste('o treinador novo não tem vaga nenhuma', () => {
    igual(vagasNoNivel(1), 0, 'nível 1 já dava vaga');
    igual(vagasNoNivel(NIVEIS_POR_VAGA - 1), 0, 'vaga apareceu antes do nível');
  });

  s.teste('as vagas crescem de N em N níveis, e não antes', () => {
    for (let nv = 0; nv <= 60; nv++)
      igual(vagasNoNivel(nv), Math.floor(nv / NIVEIS_POR_VAGA), `vagas erradas no nível ${nv}`);
  });

  /* Perfil ausente, perfil de versão antiga, `localStorage` adulterado: os três
     chegam aqui, e nenhum pode lançar. Estas funções rodam dentro do desenho da
     arena, a cada quadro — um erro aqui derruba a luta inteira. */
  s.teste('perfil ausente ou sem o campo responde "não", nunca lança', () => {
    for (const p of [null, undefined, {}, { shiny: null }, { shiny: undefined }]) {
      igual(gifShinyAtivo(p, 25), false, `gif com perfil ${JSON.stringify(p)}`);
      igual(skinShinyAtiva(p, 25), false, `skin com perfil ${JSON.stringify(p)}`);
      igual(vagasUsadas(p), 0, 'vagas usadas com perfil inválido');
    }
  });

  s.teste('desbloquear exige vaga', () => {
    const p = perfilNovo();
    igual(desbloquear(p, 25, 1), false, 'desbloqueou sem vaga');
    igual(p.shiny.gifs.length, 0, 'a tentativa sem vaga mexeu no perfil');
    igual(desbloquear(p, 25, NIVEIS_POR_VAGA), true, 'não desbloqueou com vaga disponível');
    igual(gifShinyAtivo(p, 25), true, 'desbloqueou e não ficou ativo');
    igual(skinShinyAtiva(p, 25), true, 'o GIF veio e a skin não');
  });

  /* Duplicata é a forma silenciosa de perder uma conquista: a vaga some e o
     jogador não ganha nada. */
  s.teste('desbloquear duas vezes o mesmo não gasta a segunda vaga', () => {
    const p = perfilNovo();
    desbloquear(p, 25, NIVEIS_POR_VAGA * 2);
    igual(desbloquear(p, 25, NIVEIS_POR_VAGA * 2), false, 'aceitou duplicata');
    igual(vagasUsadas(p), 1, 'a duplicata gastou vaga');
    igual(vagasLivres(p, NIVEIS_POR_VAGA * 2), 1, 'a vaga restante sumiu');
  });

  s.teste('nunca dá para desbloquear mais do que o nível permite', () => {
    const p = perfilNovo();
    const nivel = NIVEIS_POR_VAGA * 3;
    for (let d = 1; d <= 20; d++) desbloquear(p, d, nivel);
    igual(vagasUsadas(p), 3, `${vagasUsadas(p)} desbloqueios com direito a 3`);
  });

  /* Desequipar não pode apagar a conquista — é o estado que permite voltar ao
     visual normal sem perder o que se ganhou. */
  s.teste('desequipar mantém o desbloqueio', () => {
    const p = perfilNovo();
    desbloquear(p, 25, NIVEIS_POR_VAGA);
    igual(alternar(p, 'gif', 25), false, 'alternar não desligou');
    igual(gifShinyAtivo(p, 25), false, 'continua ativo depois de desligar');
    ok(p.shiny.gifs.includes(25), 'desequipar apagou o desbloqueio');
    igual(skinShinyAtiva(p, 25), true, 'desligar o GIF desligou a skin junto');
    igual(alternar(p, 'gif', 25), true, 'não deu para religar');
    igual(gifShinyAtivo(p, 25), true, 'religou e não ficou ativo');
  });

  s.teste('alternar o que não está desbloqueado não faz nada', () => {
    const p = perfilNovo();
    igual(alternar(p, 'skin', 99), false, 'alternou cosmético não desbloqueado');
    igual(skinShinyAtiva(p, 99), false, 'ativou sem desbloqueio');
  });

  /* A regra do resgate, no lugar onde ela custou uma versão ao projeto: o shiny
     é a MESMA arte recolorida, num subcaminho. Se isto virar outro repositório
     ou outro estilo, é outra coisa — e outra coisa não é resgate. */
  s.teste('a skin shiny é um subcaminho do mesmo repositório, não outra arte', () => {
    igual(SHINY_PMD, '0000/0001/', 'o caminho do recolor mudou');
    ok(!/^https?:/.test(SHINY_PMD), 'o shiny virou um endereço próprio — isso é outra fonte de arte');
  });

  s.teste('o molde vazio tem os quatro campos', () => {
    for (const k of ['gifs', 'skins', 'onGif', 'onSkin'])
      ok(k in SHINY_VAZIO, `o molde vazio não tem ${k}`);
  });

  return s;
}
