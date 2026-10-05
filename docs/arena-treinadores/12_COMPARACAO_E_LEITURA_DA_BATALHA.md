# Comparação de time e leitura da batalha

AT6-05-leitura, 05/10/2026; Spec §9.18. Estado e fila em RETOMAR/ROADMAP.
Complementa o contrato 09. Não fecha a apresentação integral ou o funil AT6-07.

## O que o jogador vê

Na Liga de times, “Ver alterações ainda não publicadas” compara o time
congelado com a equipe atual e o preset escolhido. Identifica os membros por
ID, inclusive quando evoluem. Mostra espécie, tipos, nível, IVs, natureza,
golpes, posição e os atributos que mudaram: HP, ataque, defesa, ataque especial,
defesa especial e velocidade. Golpes exibem categoria, poder e precisão do
catálogo treinador. Aparência shiny não recebe vantagem de combate.

O nível atual vem do XP, mesmo que o campo de nível da coleção esteja antigo.
XP sem ganhar nível não inventa um upgrade de luta. Os atributos são montados
pela TBE real, incluindo perdas de natureza e arredondamentos. A comparação
não simula uma partida nem transforma power em porcentagem de vitória.

Publicado/Atual são textos visíveis dentro de um detalhe expansível; não
dependem de hover. A publicação continua sendo uma ação explícita. A defesa
não se atualiza automaticamente. Trocas de preset também ficam pendentes.

Ao terminar uma luta da Jornada ou um replay 6×6, “Como foi a batalha” mostra
golpes registrados, erros, críticos, super efetivos, resistidos, imunidades,
HP retirado e nocautes dos dois lados. Usa exclusivamente os eventos da linha
encenada, sem consultar o time atual, RNG ou simular outra luta.

HP retirado é limitado à vida restante: um golpe de 80 contra oito HP conta
oito. Um golpe errado não conta como crítico ou super efetivo. No replay do
desafiante, slots originais B continuam sendo o seu time na coluna A da tela.
O resumo relata fatos; não afirma que IV, nível ou azar causou a derrota.

Empate no limite de turnos passa a dizer “sem vencedor”, pois pode haver
eliminações. Quando a amostra Monte Carlo contém empates, a narrativa informa
esse número e não trata o complemento da chance de vitória como derrota.
Zero vitórias com empates não significa que o time perdeu todas as simulações.

## Compatibilidade

A impressão do conteúdo do snapshot agora inclui `catalogoTreinador`.
Antes, alterar só a precisão explícita mantinha a versão, embora mudasse a
luta. A comparação recusa regras/conteúdo incompatíveis e não reconstrói uma
ficha histórica com regras novas. Dados publicados incompletos pedem atualização.

**Times publicados antes desta mudança precisam ser publicados novamente.**
É atualização da impressão do conteúdo, sem mudar a TBE `tbe-4` ou a fórmula
dos atributos. Replays já gravados continuam lendo o log original. Nenhuma
recompensa, taxa, matchmaking, XP ou inscrição financeira é alterada pelo painel.
O banco permanece em 150/225/300/450 XP/h por fase, com limite de 12 h por retorno.

## Verificação

- `VALIDACAO_COMPARACAO_RESULTADO.json`: 30 suítes focadas, 256 testes sem falhas
  após isolamento do teste offline que depende de DOM. As outras 29 passaram
  na execução inicial. A falha inicial de ordem de imports permanece registrada.
- 21 testes novos de comportamento: snapshots reais, evolução, IV/natureza,
  precisão, preset, ordem, segurança de texto, compatibilidade e log.
- Dentro desses testes, 100 lutas PvE e 30 lutas 6×6 conferem HP, nocautes e
  equivalência entre a linha PvE e replays das duas perspectivas.
- `SABOTAGEM_COMPARACAO_RESULTADO.json`: 14/14 mutantes S90701–14 capturados
  por falhas de asserção, sem contar erro de sintaxe como captura.
- 2.721 âncoras presentes; 2.707 mutantes fora deste grupo não executados
  nesta rodada. Q2 legado integral não executado.
- `SMOKE_COMPARACAO_RESULTADO.json`: HTML e quatro módulos novos entregues
  com HTTP 200 e MIME correto. Isso não executa ou inspeciona o navegador.

Q5 permanece pendente: Chromium ausente no ambiente. Testes de modelo,
HTML produzido e grafo de módulos não certificam ligação em navegador,
legibilidade ou larguras 1920/1440/1100/420. Sem alteração de grid/CSS.
Q6: nomes/textos escapados; sem endpoint ou comando financeiro novo.
Q8/Q9: sem nova transação/telemetria. O resumo não é instrumentação do funil.

```bash
node tools/testar-arena.mjs --so=comparacao-time,resumo-batalha,liga-home,equipe-snapshot,pve,liga-replay,liga-palco
node tools/testar-arena.mjs --so=progressao-offline
node tools/sabotar-arena.mjs --grupo=comparacao
```

O segundo comando roda separado: `modulos` importa UI sem DOM e o Node
mantém imports rejeitados no cache; isso afeta o teste sintético offline
quando rodado depois. Produto e regras offline não foram modificados para
contornar a ordem do arnês. A composição do relatório preserva essa limitação.
