/* Q1/Q2 · QUAL FOLHA O BICHO USA — o D-091, que custou três dias.
 *
 *   > "as sprites continuam bugadas sem sair os efeitos de ataque, e os
 *   >  pokémon selvagem ficam sumindo as sprite" — o dono, 10/09/2026
 *
 * O sumiço tinha uma causa aritmética: a escolha da folha perguntava à TABELA
 * do PMD (146 espécies com `a` e `h`) e o disco tinha 76. Trocar para uma folha
 * que não existe deixa o `background-image` vazio — e um elemento transparente
 * do tamanho certo não é um erro que alguém vê no console: é a criatura sumindo.
 *
 * ── POR QUE ESTE ARQUIVO EXISTE, E NÃO UM TESTE DE NAVEGADOR ─────────────
 *
 * Porque a linha morava colada ao `style.backgroundImage`, e conta colada em
 * estilo inline não pode ser afirmada sem Chromium. Este bloco é a sétima vez
 * que a mesma lição volta:
 *
 *   > Conta que só pode ser verificada com navegador acaba verificada por
 *   > ninguém.
 *
 * Movida para camada 0, ela vira quatro asserções de dados para dados.
 */
import { readFileSync } from 'node:fs';
import { criarSuite, ok, igual } from './harness.mjs';
import { animDoMomento, aSondar, marcarFolha, vereditoDa, esquecerFolhas,
         quantasFaltam, FOLHA_BASE } from '../app/modules/folha-viva.mjs';

const ler = f => readFileSync(new URL(f, import.meta.url), 'utf8');

/* Uma grade como a do PMD: promete as três folhas. */
const GRADE = { w: [32, 32, [4]], a: [64, 64, [4]], h: [40, 40, [2]] };
const URL_DE = k => 'sprite/0039/' + k + '.png';

export function suite() {
  const s = criarSuite('folha-viva');

  /* ── A ASSERÇÃO CENTRAL, e ela é literalmente o defeito ─────────────── */
  s.teste('a folha que a tabela promete e o disco não tem NÃO é usada', () => {
    esquecerFolhas();
    marcarFolha(URL_DE('a'), false);        // 404: a origem não tem esta
    igual(animDoMomento({ batendo: true }, GRADE, URL_DE), FOLHA_BASE,
      'batendo sem folha de ataque em disco, a cena continuou pedindo a folha ' +
      'de ataque. O `background-image` vem vazio e a criatura SOME no instante ' +
      'exato do golpe — com a placa de nome continuando no ar. Foi o D-091, e ' +
      'foi o que o dono viu por três dias.');
  });

  s.teste('enquanto ninguém sabe, o bicho continua o bicho', () => {
    esquecerFolhas();                        // veredito `undefined`
    igual(animDoMomento({ batendo: true }, GRADE, URL_DE), FOLHA_BASE,
      'com o veredito desconhecido a cena arriscou a folha do momento. ' +
      '`undefined` não é `true`: arriscar aqui é aceitar um quadro vazio a cada ' +
      'sonda que ainda não voltou, e um quadro vazio é o bicho piscando fora.');
    marcarFolha(URL_DE('a'), true);
    igual(animDoMomento({ batendo: true }, GRADE, URL_DE), 'a',
      'a folha carregou e a cena continuou na caminhada — o golpe não aparece, ' +
      'que é a outra metade da mesma queixa');
  });

  s.teste('apanhar usa a folha de dano, e bater vence apanhar', () => {
    esquecerFolhas();
    marcarFolha(URL_DE('a'), true); marcarFolha(URL_DE('h'), true);
    igual(animDoMomento({ apanhando: true }, GRADE, URL_DE), 'h', 'apanhar não usa `h`');
    /* Quem bate e apanha no mesmo quadro está ATACANDO. A ordem inversa faria
       o golpe sumir toda vez que o bicho levasse um no mesmo instante — que é
       o caso comum de um duelo, e não a exceção. */
    igual(animDoMomento({ batendo: true, apanhando: true }, GRADE, URL_DE), 'a',
      'bater e apanhar no mesmo quadro escolheu o dano; o golpe do bicho ' +
      'desapareceria em metade dos quadros de um duelo');
  });

  s.teste('a tabela ainda vale como primeiro filtro', () => {
    esquecerFolhas();
    marcarFolha(URL_DE('a'), true);
    /* Sem a entrada na tabela não há como recortar a folha: ela diz quantos
       quadros existem. A tabela deixou de ser a ÚLTIMA palavra, não a primeira. */
    igual(animDoMomento({ batendo: true }, { w: GRADE.w }, URL_DE), FOLHA_BASE,
      'a espécie não tem `a` na tabela e a cena pediu a folha de ataque — não ' +
      'há de onde tirar o número de quadros para recortá-la');
  });

  s.teste('sonda-se uma vez, e só o que ninguém perguntou', () => {
    esquecerFolhas();
    igual(aSondar(GRADE, URL_DE).length, 2, 'não pediu as duas folhas do combate');
    marcarFolha(URL_DE('a'), true);
    igual(aSondar(GRADE, URL_DE).join(), URL_DE('h'),
      'voltou a pedir uma folha cujo veredito já existe — sessenta quadros por ' +
      'segundo criariam sessenta sondas do mesmo endereço');
    marcarFolha(URL_DE('h'), false);
    igual(aSondar(GRADE, URL_DE).length, 0, 'insistiu numa folha já reprovada');
    igual(quantasFaltam(), 1, 'a contagem de folhas reprovadas não bate');
  });

  /* ── E QUE A CENA REALMENTE PERGUNTE ────────────────────────────────────
     Sem isto, o módulo acima ficaria perfeito e não ligado — que é o modo de
     falha que este bloco já viu duas vezes (o efeito e o hitbox: existiam,
     rodavam, e não chegavam aos olhos). */
  s.teste('a cena e o companheiro decidem pelo MESMO escolhedor', () => {
    for (const arq of ['../app/modules/avanco-cena.mjs',
                       '../app/modules/idle-companheiro.mjs']) {
      /* SEM OS COMENTÁRIOS. Um teste que proíbe o NOME proíbe explicar — e a
         explicação do defeito CITA a linha defeituosa, porque é ela que dá o
         motivo. Esta suíte já reprovou dois blocos por isso; a varredura é do
         CÓDIGO, e o comentário fica livre para contar a história. */
      const t = ler(arq).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      ok(/animDoMomento\(/.test(t),
        `${arq} não chama \`animDoMomento\` — ele voltou a decidir a folha ` +
        `sozinho, e é ali que o D-091 morava`);
      ok(/sondarFolha\(/.test(t),
        `${arq} não sonda a folha: sem sonda o veredito nunca sai de ` +
        `\`undefined\`, e o bicho fica na caminhada para sempre — o golpe some`);
      /* A linha antiga, literalmente. Ela não pode voltar. */
      ok(!/grade\.a \? 'a'/.test(t) && !/ANIM_DO_COMBATE\[p\.anim\] \?\? 'Walk'/.test(t),
        `${arq} voltou a escolher a folha pela TABELA. A tabela diz o que a ` +
        `arte PODERIA ter; só o carregamento diz o que ela TEM.`);
    }
  });

  return s;
}
