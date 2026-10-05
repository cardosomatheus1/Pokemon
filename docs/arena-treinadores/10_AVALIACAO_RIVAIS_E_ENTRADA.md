# Rivais, catálogo de golpes e entrada no Avanço

Avaliação aplicada ao código em 04–05/10/2026, sobre o commit local `57388f6`.
Contrato: Spec §8.19. Estado e fila continuam em RETOMAR/ROADMAP.

## Correção aplicada

A TBE já considerava precisão, crítico, variação de dano, STAB, efetividade,
nível e atributos. A montagem do rival usava outra régua: precisão omitida
virava 100%, enquanto a batalha usava 92%; a categoria menos forte recebia
uma penalidade fixa de metade. Isso podia montar um repertório pior sem
que a espécie, o nível ou o IV justificassem a diferença.

`movesetDoRival` agora usa o catálogo do treinador e o dano esperado da própria
TBE. A referência para montar o repertório tem defesa física/especial de base
80 no mesmo nível, nenhum tipo e HP ilimitado. Essa referência apenas ordena
os golpes: a luta continua calculando contra o alvo real, com seus tipos,
defesas, IVs, natureza, vida e nível. A montagem não consulta o jogador nem
uma semente futura. A referência não é uma chance de vitória.

Os rivais preservam a identidade de especialistas: priorizam golpes de seus
tipos e da categoria de seu maior atributo quando há pelo menos dois. A
reserva completa repertórios menores. Aprendizado por nível, até quatro
golpes, empate alfabético e padrão do jogador foram preservados. O jogador
continua escolhendo os seus; nenhuma criatura foi reconfigurada automaticamente.

Política de montagem `rival-2`; regras de combate continuam `tbe-4`. Novas
runs identificam a política e congelam os nomes dos golpes de cada rival.
Runs anteriores, inclusive sem essa etiqueta, continuam com seu snapshot.
Jornada persistida mantém os times gravados. A Arena comum e os times da
Arena 6×6 montados pelos jogadores não recebem essa política de NPCs.

## Impacto medido

- 15.100 combinações de espécie/nível: 3.461 ordens mudaram; somente 30
  combinações trocaram efetivamente algum golpe disponível na seleção.
- Ginásios/Liga: 2.000 simulações por time de referência, mesmas sementes e
  condições anteriores. Todas as taxas gravadas permaneceram idênticas.
  Todos os ginásios mantêm taxa abaixo de 50% ao ignorar a lição; aplicá-la
  melhora ao menos 20 pontos percentuais. A Liga mantém o ganho relativo.
- Primeiro combate da Jornada, inicial sozinho no nível 5: 88,9%/90,8%/97,3%
  (planta/fogo/água). Isso é distinto de concluir dez waves no Avanço.
- Avanço: 3.500 runs, 35 cenários, sementes e horários pareados com o estudo
  anterior. Taxa, abates e duração permaneceram iguais em todos os cenários.
  Os cenários de nível/IV preservam a vantagem de uma equipe mais treinada.

Fontes: AUDITORIA_RIVAIS.json, BALANCEAMENTO_AVANCO_RIVAIS.json,
`test/fixtures/ginasios.json`. O relatório anterior continua preservado;
não houve regravação de números para acomodar uma regressão.

## Catálogo: progressão e diversidade

A auditoria encontrou 23 pares no Kanto e 16 no pack original em que um golpe
oferece poder e precisão iguais ou maiores, sendo ao menos um maior. Compara
somente o mesmo tipo/categoria e ausência de secundários. Não comparar físico
com especial: a defesa do alvo muda. A dominância de dano esperado pode
empatar por arredondamento ou vida restante; não prova maior chance de vitória
em todo confronto.

Exemplo de progressão: Extreme Speed abre no nível 20; Body Slam no 23 e
Skull Bash no 45. No código atual não há prioridade nem recarga: depois da
liberação, parte desse repertório perde utilidade relativa. Os golpes antigos
continuam úteis enquanto os superiores estão bloqueados. Não foram removidos.

Dynamic Punch e Cross Chop abrem ambos no 28, têm poder 100, mas 60% versus
80% de precisão. Sem confusão implementada, Dynamic Punch perde diversidade
prática. Essa é uma limitação real do catálogo atual, não um efeito oculto
executado pelo motor. Redesenho de secundários tem dono AT6-14 (L-AT6-06).

Surf (90/100%) e Hydro Pump (110/80%) não apresentam dominância estrita.
Podem oferecer escolhas diferentes conforme alvo, arredondamento e chance
de nocaute. Nomes conhecidos não conferem PP, prioridade, recarga ou status.

## Entrada: rota importa

Outro holdout mediu 3.300 runs: onze biomas × três iniciais × cem sementes.
Inicial sozinho, nível 5, IV 15, estágio 1, moveset padrão e sem poções;
12h/23h UTC alternados. Não valida desbloqueio de cada bioma na conta.

| Inicial | Rota avaliada | Conclusão em 100 runs |
|---|---|---:|
| Bulbasaur | Praia | 98% |
| Charmander | Floresta | 81% |
| Squirtle | Deserto | 92% |

São estimativas de amostra, não probabilidades garantidas ou textos prontos
para a UI. A Floresta do estudo anterior permanece 5%/78%/4% no nível 5,
com as sementes anteriores. As duas medições usam raízes diferentes.

O problema de entrada pede orientação de rota/equipe conforme os adversários
reais. Aplicar uma recomendação deve respeitar acesso à rota, clima, nível,
moveset e equipe atual; não assumir que o inicial determina toda a conta.
É preferível mostrar um motivo concreto (tipos e golpes) e a próxima captura
útil. Não reduzir todos os tipos a dano neutro nem dar vitória automática.
Derrotas parciais continuam pagando abates. L-AT6-04 permanece aberta porque
este estudo não implementou essa orientação ou certificou a primeira sessão.

Fonte: BALANCEAMENTO_INICIO_AVANCO.json. O ritmo offline continua
150/225/300/450 XP/h, conforme a fase; não mudou neste bloco.

## Verificação e limites

VALIDACAO_RIVAIS.json registra 25 suítes/212 testes focados executados. SABOTAGEM_RIVAIS.json
registra seis mutantes capturados: precisão 100%, catálogo ignorado,
penalidade arbitrária, golpes antecipados, risco confundido com dominância
e mistura de categorias. Nenhum exige navegador.

Não houve alteração de tela ou CSS. Sem endpoint, transação, fila ou telemetria
nova (Q6/Q8/Q9). Q5 acumulado das telas anteriores e portões integrais de
release continuam pendentes. Mudanças e relatórios são locais; não publicados.


A integração do Centro foi isolada em processo Node para não reutilizar
avaliação rejeitada por um check anterior de módulos sem DOM. A ordem
módulos→catálogo passa; REVALIDACAO_CATALOGO_RIVAIS.json com quatro mutantes capturados comprova
que os dados visíveis e o consumo pela TBE continuam sendo cobrados.
