/* AS PALAVRAS DE CADA FOCO — nome, cor e as três frases (camada 0).
 *
 * Saiu do `idle-foco.mjs` no item 1 da ordem do dono, e a divisão é por
 * RESPONSABILIDADE: aquele arquivo é a JANELA de escolha — ouvintes, DOM,
 * `innerHTML`. Esta tabela é DADO, e dado não precisa de navegador.
 *
 * ── POR QUE ISSO PRECISOU ACONTECER ──────────────────────────────────────
 *
 * A coluna da run passou a dizer o que cada foco rende ALI, e o portão Q2
 * cobrou o preço de a frase morar dentro de uma `innerHTML`: dois defeitos
 * plantados — esconder o aviso do foco futuro, e engolir a frase do foco
 * neutro — **passaram**, porque nenhum teste conseguia ler a resposta sem
 * montar um DOM.
 *
 *   > Frase que só existe dentro de uma string de HTML é frase que ninguém
 *   > consegue verificar. Tirá-la de lá é o que a torna afirmável.
 *
 * É a terceira vez neste bloco que a mesma lição aparece — antes com a
 * separação das placas e com a contagem do quadro. As três viraram função
 * pura, e as três ganharam teste que olha o RESULTADO.
 *
 * O `idle-foco.mjs` continua reexportando `FALA`: quem a conhecia por lá não
 * muda de `import`, e uma divisão interna que obriga cinco arquivos a mudar de
 * endereço não é divisão — é mudança de API.
 */
/* ── A FALA DE CADA FOCO ───────────────────────────────────────────────────
 *
 * O texto sai daqui e os NÚMEROS saem da tabela do motor. Escrever "+30%" à mão
 * aqui seria a mesma dor do D-058: alguém mexe no motor, a tela continua
 * prometendo o número velho, e nenhum teste percebe porque os dois lugares
 * estão certos separadamente. */
export const FALA = {
  batedor: {
    nome: 'Batedor', cor: '#5efc8d',
    resumo: 'muitos encontros, quase todos comuns',
    onde: 'na Batida',
    detalhe: 'para quem está online agora e quer volume',
  },
  trilheiro: {
    nome: 'Trilheiro', cor: '#ffc107',
    resumo: 'mais material, em qualquer expedição',
    onde: 'em todo perfil',
    detalhe: 'a Essência é o que se troca por item',
  },
  vigia: {
    nome: 'Vigia', cor: '#8f7bff',
    resumo: 'menos encontros, e um raro garantido',
    onde: 'na Vigília',
    detalhe: 'para quem manda dormir e quer o achado, não a conta',
  },
  sortudo: {
    nome: 'Sortudo', cor: '#7ff0ff',
    resumo: 'o que CAI melhora; quem aparece, não',
    onde: 'em todo perfil',
    detalhe: 'separa caçar item de caçar criatura',
  },
  guia: {
    nome: 'Guia', cor: '#ff9ad5',
    resumo: 'levanta os COMPANHEIROS, e nada para si',
    onde: 'só acompanhado',
    detalhe: 'sozinho não faz nada — é o preço de ele existir',
  },
};
