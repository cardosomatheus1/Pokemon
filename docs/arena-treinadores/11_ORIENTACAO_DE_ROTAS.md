# Orientação de rotas aplicada ao Avanço

Implementação GQ-01-rotas, 05/10/2026; Spec §7.22.21. Estado e fila em
RETOMAR/ROADMAP. Complementa o estudo 10 sem alterar combate ou recompensa.

O controle do Avanço mostra uma orientação para a equipe selecionada e o
estágio escolhido. A sugestão inclui um golpe real e seu efeito contra um
adversário do elenco público. O alerta deixa claro a qual rota selecionada
se refere. “Comparar” só escolhe o bioma; o jogador ainda decide iniciar.
Bloqueio de ação substitui o conselho e remove o botão de comparação.

## Como a orientação é calculada

Usa TBE para montar lutadores e avaliar dano esperado contra stats/tipos
reais. Nível, IV, natureza, físico/especial, STAB, precisão, crítico e
arredondamento entram nesse dano. A imunidade usa último recurso, com o nome
do pack. Os NPCs têm IV 15, golpes liberados de rival-2 e níveis da run.

Para cada rival, comparar a fração de sua vida causada por ataque com a
fração da vida do aliado recebida por ataque. Usar o melhor membro selecionado
para cada duelo. O índice é a média dos logaritmos para comuns e para chefes,
com peso igual entre os grupos. Comuns representam a última wave comum;
chefes representam a décima. Empates seguem a ordem do mapa do pack.

Essa é uma medida de cobertura de golpes. Não reproduz iniciativa, ordem
real dos aliados, desgaste de HP, poções, bonus do guia ou a run inteira.
Não considera uma criatura da caixa ou fora da seleção como ajuda potencial.
A coleção só abre o estágio; a comparação usa os membros que irão à run.

O período público pode mudar a sugestão. Clima e semente futuros não podem.
Não publicar o índice numérico ou transformá-lo em chance de conclusão.
A tela diz que velocidade, sequência, curas e clima também influenciam.
Sem mudanças no acesso, taxas de captura, XP, dinheiro, stamina ou RNG.

## Resultado medido

Holdout separado de 2.400 runs pareadas: 12 cenários × 100 sementes × duas opções
(sugestão e Floresta). 12h/23h UTC alternados, IV 15, sem poções. A sugestão
foi calculada antes de acessar a raiz/clima da run. Fontes e tempos no JSON.

| Equipe | Nível | Sugestão | Conclusão sugerida | Floresta |
|---|---:|---|---:|---:|
| Bulbasaur | 5 | Deserto | 100% | 3% |
| Charmander | 5 | Floresta | 79% | 79% |
| Squirtle | 5 | Deserto | 95% | 3% |
| Trio de formas intermediárias | 12 | Deserto | 99% | 46% |
| Trio de formas finais | 19 | Deserto | 100% | 63% |
| Trio de formas finais | 31 | Deserto | 95% | 80% |

São taxas de uma amostra de cem por opção, não garantia. Não comparamos com
cada rota para declarar uma escolha ótima. Em níveis maiores as opções
podem convergir. A orientação favorece adversários com boa afinidade de
ataques, tornando a escolha do mapa útil já no começo.

## Verificação e limites

VALIDACAO_ORIENTACAO_AVANCO.json reúne 21 suítes/292 testes focados verdes.
SABOTAGEM_ORIENTACAO_AVANCO.json cobra recusa, IV/moveset, membros fora da
seleção, vazamento de clima futuro, escape de HTML e último recurso.
Nenhum dos sete mutantes precisa de navegador. Teste de pintura usa o
componente real com alvo sintético, incluindo limpeza de ação após recusa.

Q5 permanece pendente: não há Chromium disponível neste ambiente. A árvore
de módulos e o HTML não provam que o painel cabe e é legível no celular.
HTTP estático entregou app e dois módulos novos com 200/MIME correto; isso
não certifica execução no navegador. Nenhum endpoint/transação/telemetria foi
criado. Publicação não foi realizada.

Deserto apareceu com frequência na amostra de trios. Isso pede medir como
recompensas/capturas/objetivos distribuem a população entre rotas. Não alterar
recompensas automaticamente para obrigar o jogador a uma rota desfavorável.
L-GQ-01-01 tem dono GQ-02/AT6-05. A orientação não fecha a primeira sessão,
o funil até Liga/6×6 nem toda a revisão de economia/captura/evolução.

```bash
node tools/medir-orientacao-avanco.mjs --saida=docs/arena-treinadores/BALANCEAMENTO_ORIENTACAO_AVANCO.json
node tools/sabotar-arena.mjs --grupo=orientacao --saida=docs/arena-treinadores/SABOTAGEM_ORIENTACAO_AVANCO.json
```
