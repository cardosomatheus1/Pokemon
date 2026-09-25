# Inventário de lacunas e defeitos históricos

Este inventário não declara quantos problemas estão abertos hoje. Títulos podem conter “fechada/corrigido”, mas isso é estado reportado no momento do texto. O corpo original completo permanece preservado; consultar antes de criar ou encerrar tarefa.

## Contagem sem perder duplicatas

| Registro | Ocorrências | IDs distintos | Duplicatas |
|---|---:|---:|---|
| L | 180 | 178 | L-098 (2 ocorrências), L-119 (2 ocorrências) |
| D | 96 | 96 | Nenhuma |

O maior número de ID não é a quantidade de registros. L-098 e L-119 têm duas ocorrências cada; títulos e linhas distinguem os assuntos. O JSON inclui indicações textuais de estado/dono, sem concluir a resolução atual.

## Triagem dirigida pela revisão

| Referências históricas | Destino de trabalho | Regra |
|---|---|---|
| L-178 | PROD-133/134 | Próxima entrega de produto após baseline |
| L-177 | PROD-134 e DEC-10 | Explicação e segredo do clima reconciliados |
| L-159; limites Avanço/OFF | INT-01 | Verificar emissão, reserva e resgate |
| L-157/L-055 | INT-02 | Confirmar autoridade da posse e persistência |
| L-171/L-172/L-175/L-176/L-160; D-082 | UX-01 | Reproduzir antes de corrigir; priorizar compreensão/jornada |
| L-174; D-093 | BASE-01 / impedimento técnico | Jornada de run e comparação visual real |
| L-023 | Economia / reprodução futura | Álgebra conferida; resultado empírico original não reproduzido |
| L-126/L-144 | DEC-03/04 | Cadeado não demonstra ausência de poder pago |
| L-117 | DEC-02 / COM-01 | RMT preservado como visão condicionada |
| L-143/L-158 | DEC-05/06 | Conteúdo e ofertas deliberados, sem autopreenchimento |
| L-167/L-173; D-049/D-032/D-053/D-105 | Dívida localizada | Só entra com dependência concreta do bloco ativo |
| D-060/D-077/D-086 | BASE-01 se reproduzir | Sintoma semelhante não prova a mesma causa |
| D-078/D-099/D-104 | Política de evidência visual | Não restabelecer solução abandonada sem contexto |
| L-179 e trilhas de desempenho | Ferramental condicionado | Medir frio/quente/alterado separadamente |

## Ocorrências completas

Linha é a posição no original recebido, útil para busca local. Toda ocorrência está em estado “histórico a reconciliar”. O título é transcrito para rastreabilidade, não endossado como regra vigente.

### LACUNAS.md

[Abrir original completo](../historico/original_recebido/LACUNAS.md)

| Ocorrência | Linha | Título histórico |
|---|---:|---|
| L-019#1 | 24 | L-019 — a varredura de símbolos não é verificador de escopo ✅ FECHADA |
| L-001#1 | 77 | L-001 — 14 dos 66 golpes nunca são atribuídos a ninguém |
| L-002#1 | 94 | L-002 — um lutador vence 4× mais que a média |
| L-003#1 | 109 | L-003 — 13 dos 76 lutadores não conseguem causar dano a um oponente específico |
| L-004#1 | 120 | L-004 — amplitude de 16,6× entre o melhor e o pior do elenco |
| L-005#1 | 137 | L-005 — animação de entrada não acompanha o relógio da fase ✅ FECHADA |
| L-006#1 | 156 | L-006 — a rodada depende de `requestAnimationFrame` |
| L-007#1 | 165 | L-007 — sabotagem fácil demais enquanto os goldens forem byte-exatos ✅ FECHADA |
| L-014#1 | 190 | L-014 — `spriteURL` mora no motor e é dado de conteúdo ✅ FECHADA |
| L-015#1 | 206 | L-015 — quatro handlers `onclick` embutidos no HTML ✅ FECHADA |
| L-016#1 | 217 | L-016 — o corte duro de tempo nunca é exercitado ✅ FECHADA |
| L-017#1 | 232 | L-017 — a dependência de CDN de terceiros em tempo de execução ✅ FECHADA |
| L-018#1 | 280 | L-018 — não existe sprite de ovo |
| L-020#1 | 295 | L-020 — a ligação exporta 13 apelidos herdados ✅ FECHADA |
| L-021#1 | 322 | L-021 — o motor exige um pool de golpes chamado `normal` ✅ FECHADA |
| L-022#1 | 344 | L-022 — a garantia de tipo na pool é um canal de informação sobre o clima ✅ FECHADA |
| L-023#1 | 385 | L-023 — o viés de convexidade é medido, mas não corrigido ✅ FECHADA |
| L-024#1 | 451 | L-024 — o bucket `pendente` existe e nada o preenche |
| L-025#1 | 475 | L-025 — o portão fecha bloco com uma execução só ✅ FECHADA |
| L-008#1 | 515 | L-008 — o jogo não tem trilha sonora própria |
| L-009#1 | 533 | L-009 — os simuladores não incorporam os cenários novos ✅ FECHADA |
| L-010#1 | 548 | L-010 — não existe política de publicidade e afiliados |
| L-011#1 | 557 | L-011 — os limiares de risco são chute educado até haver coorte |
| L-013#1 | 566 | L-013 — os capítulos 6 a 9 da Spec ficaram desatualizados ✅ FECHADA |
| L-012#1 | 598 | L-012 — a consulta de enquadramento regulatório não foi feita |
| L-026#1 | 608 | L-026 — o baú não tem contra o que ser calibrado ✅ DESTRAVADA |
| L-027#1 | 638 | L-027 — o véu de cor por arena foi documentado e não construído ✅ FECHADA |
| L-028#1 | 683 | L-028 — o porte fechou; o que ele deixou aberto |
| L-029#1 | 707 | L-029 — a tela principal reprova no teste dos 3 segundos |
| L-032#1 | 779 | L-032 — a idempotência tem duas redes e a suíte só alcança uma ✅ FECHADA |
| L-033#1 | 839 | L-033 — o backend inteiro existe e nada dele é alcançável por HTTP ✅ FECHADA |
| L-034#1 | 895 | L-034 — dois dos sete sinais de risco não têm de onde medir |
| L-035#1 | 919 | L-035 — suíte que dispara processo filho invalida o cache do Q2 inteiro ✅ FECHADA |
| L-038#1 | 985 | L-038 — três mutantes equivalentes, e todos com a mesma forma |
| L-036#1 | 1041 | L-036 — o cliente ainda guarda a própria carteira |
| L-037#1 | 1090 | L-037 — a tela "acertou e não ganhou" nunca foi lida de perto ✅ FECHADA |
| L-031#1 | 1157 | L-031 — o que a TERCEIRA passada do crítico abriu |
| L-030#1 | 1212 | L-030 — o que a segunda passada do crítico deixou aberto ✅ FECHADA |
| L-039#1 | 1304 | L-039 — em modo servidor o cliente ainda cria uma carteira local no boot ✅ FECHADA |
| L-040#1 | 1352 | L-040 — o valor do resgate é chute educado até haver coorte |
| L-041#1 | 1378 | L-041 — o operador do painel se declara, não se prova ✅ FECHADA |
| L-042#1 | 1417 | L-042 — o ContentPack original existe, é jogável, e não tem arte |
| L-043#1 | 1483 | L-043 — o pack original tem outra distribuição de desfecho, e a economia foi medida na antiga |
| L-044#1 | 1523 | L-044 — o balão do golpe passa por baixo do crachá de clima ✅ FECHADA POR DECISÃO |
| L-045#1 | 1548 | L-045 — o portão de contraste não enxerga `filter` ✅ FECHADA no R19 |
| L-046#1 | 1573 | L-046 — o Rayquaza ao fundo das arenas ✅ FECHADA no R17 |
| L-047#1 | 1602 | L-047 — `margem.definir` tem papel e auditoria, e não tem rota ✅ FECHADA no R18 |
| L-048#1 | 1683 | L-048 — as três cenas antigas não passam pelo catálogo do acervo |
| L-049#1 | 1706 | L-049 — a linha de base visual não fotografa mais a fase de contagem |
| L-050#1 | 1733 | L-050 — a Liga sabe colapsar contas ligadas, e ninguém as liga sozinho |
| L-051#1 | 1761 | L-051 — os testes de settlement apostam valor fixo no campeão, e a cauda continua aberta |
| L-052#1 | 1788 | L-052 — três testes de aposta aceitam QUALQUER recusa, e uma delas seria a errada |
| L-053#1 | 1812 | L-053 — o `conferirAbates` do killfeed continua com a própria travessia |
| L-054#1 | 1839 | L-054 — três dos cinco tipos de desafio ainda não têm quem os alimente |
| L-055#1 | 1867 | L-055 — o cosmético não sobrevive a limpar o navegador, e o F1.10 não o possui |
| L-056#1 | 1906 | L-056 — o gancho que limpa as caixas não tem teste direto |
| L-057#1 | 1941 | L-057 — os lendários como raid cooperativa, e o elenco de cada modo |
| L-058#1 | 2006 | L-058 — a carência antes de anunciar no mercado não tem número |
| L-059#1 | 2026 | L-059 — as três decisões visuais do sub-jogo |
| L-060#1 | 2048 | L-060 — os 76 são da ARENA; o idle e a torre são 151, e faltam 75 sprites |
| L-061#1 | 2074 | L-061 — o mato alto, e por que ele não é enfeite |
| L-062#1 | 2095 | L-062 — a estética e a estrutura dos combates da Torre |
| L-063#1 | 2169 | L-063 — o cenário precisa de mais que árvore e pedra |
| L-064#1 | 2193 | L-064 — o 1.1 construiu a criatura, e ninguém a vê ainda |
| L-065#1 | 2215 | L-065 — `foco` existe na criatura e ninguém escreve nele |
| L-066#1 | 2233 | L-066 — a loja de dinheiro real, e o boost de stamina |
| L-067#1 | 2293 | L-067 — outfits autorais no lugar dos do Emerald |
| L-068#1 | 2412 | L-068 — cinco biomas sem item de assinatura |
| L-069#1 | 2472 | L-069 — o idle inteiro ainda não persiste |
| L-070#1 | 2520 | L-070 — de onde vem cada outfit: as quatro procedências |
| L-071#1 | 2584 | L-071 — o dossiê explicado ao dono, e o que ele ainda não faz |
| L-072#1 | 2630 | L-072 — como a área cosmética inteira separa o que é dado do que é ganho |
| L-073#1 | 2710 | L-073 — o alinhamento pela base do outfit não é exercido por nenhuma arte |
| L-074#1 | 2750 | L-074 — três outfits só têm a vista de frente na arte de origem |
| L-075#1 | 2793 | L-075 — o Pokémon que acompanha usa o sprite de BATALHA |
| L-076#1 | 2830 | L-076 — o caderno de ideias do dono, tudo que ele lançou e ainda não virou bloco |
| L-077#1 | 2886 | L-077 — a tela da rota ajustável pelo jogador, e o relevo próprio de cada bioma |
| L-078#1 | 2948 | L-078 — a batalha de NPC, que é o resto do 1.7 |
| L-079#1 | 3049 | L-079 — sete defeitos plantados que nenhuma afirmação pega |
| L-080#1 | 3127 | L-080 — REGRA PERMANENTE: todo sprite de Pokémon mostrado ao jogador é GIF animado |
| L-081#1 | 3144 | L-081 — O banner do idle: o Pokémon do PERFIL, e o que o banner diz |
| L-082#1 | 3182 | L-082 — quatro expedições simultâneas, cada uma no seu bioma |
| L-083#1 | 3254 | L-083 — O quadro de "onde está cada um" |
| L-084#1 | 3276 | L-084 — Stages por bioma: como se abrem, e o que eles mostram antes |
| L-085#1 | 3329 | L-085 — O battle log do idle: provavelmente NÃO fazer |
| L-086#1 | 3348 | L-086 — A mochila, a equipe e o status: o painel que a prévia mostrava |
| L-087#1 | 3373 | L-087 — A moeda do idle ainda não tem nome nem cara |
| L-088#1 | 3388 | L-088 — A tela da rota é maior que a janela |
| L-089#1 | 3412 | L-089 — O som da arena toca em abas onde a arena não está |
| L-090#1 | 3422 | L-090 — A Torre: treze andares, e o que se perde ao sair |
| L-091#1 | 3475 | L-091 — o S642 escapa porque a sonda manda no bioma que ja esta na tela |
| L-092#1 | 3508 | L-092 — A ECONOMIA DE ITENS: de onde vem cada coisa |
| L-093#1 | 3586 | L-093 — A WIKI DE ITENS, e o que ela destrava |
| L-094#1 | 3624 | L-094 — O MERCADO DE DINHEIRO REAL: a porta que muda a categoria do produto |
| L-095#1 | 3671 | L-095 — AS TRÊS MOEDAS TÊM NOME, e a `Essência` mudou de papel |
| L-096#1 | 3732 | L-096 — O TETO DE USO, e por que ele é melhor que o teto de compra |
| L-097#1 | 3776 | L-097 — O REBALANCEAMENTO DA ESCALA: por que 100 parece mais que 10 |
| L-098#1 | 3908 | L-098 — A ARTE DO POKÉCASH — RESOLVIDA no mesmo dia |
| L-098#2 | 3915 | L-098(a) — a pergunta, para quando ela voltar |
| L-099#1 | 3946 | L-099 — `nivel`, `vinculo` e `foco` existem e ninguém os move |
| L-100#1 | 4000 | L-100 — a esteira de OLHAR não sabia abrir a aba do idle |
| L-101#1 | 4066 | L-101 — no panorâmico o mundo fica largo e VAZIO |
| L-102#1 | 4120 | L-102 — o `foco` é uma escolha, e ainda não há onde fazê-la |
| L-103#1 | 4169 | L-103 — nenhuma guarda barata confere que um `import` acha o que importa |
| L-104#1 | 4231 | L-104 — sete itens ainda sem ícone confirmado |
| L-105#1 | 4286 | L-105 — a escada de estágios acaba no dia 13, e o nível vai até o 168 |
| L-106#1 | 4355 | L-106 — a evolução não existe, e as dez pedras não são consumidas por nada |
| L-107#1 | 4390 | L-107 — o Vulcão está magro e SEM O MEIO DA TABELA |
| L-108#1 | 4426 | L-108 — a tipagem e os stats não influenciam o idle, e deveriam |
| L-109#1 | 4469 | L-109 — o HISTÓRICO DA EXPEDIÇÃO, e o VS que a batalha de NPC merece |
| L-110#1 | 4530 | L-110 — o quadro de colocação da Arena é pequeno demais para decidir |
| L-111#1 | 4547 | L-111 — o Pokémon SAI DA POKÉBOLA quando entra na equipe |
| L-112#1 | 4573 | L-112 — a aposta precisa ser CONFIRMADA, e a janela vai para 40 s |
| L-113#1 | 4618 | L-113 — a tela fica PEQUENA em 2560×1440, e não pode piorar em 1920×1080 |
| L-114#1 | 4660 | L-114 — a EVOLUÇÃO existe no motor e ninguém a chama |
| L-115#1 | 4715 | L-115 — a captura não tem animação — CONSTRUÍDA no 1.23 |
| L-116#1 | 4759 | L-116 — as faixas de raridade precisam de destaque — CONSTRUÍDA no 1.23 |
| L-117#1 | 4834 | L-117 — o REPASSE DO RMT: o PokéCash bloqueado como trava contábil |
| L-118#1 | 4896 | L-118 — a TORRE tem cura e poção, e o HP nasce lá |
| L-119#1 | 4933 | L-119 — O CLIMA NO IDLE ✅ CONSTRUÍDA no 1.32 (10/09/2026) |
| L-119#2 | 4968 | L-119 — O CLIMA NO IDLE: buff de FARM, e não de dano |
| L-120#1 | 5045 | L-120 — POP-UPS DE CONFIRMAÇÃO — a da EXPEDIÇÃO construída no 1.24 |
| L-121#1 | 5073 | L-121 — A SELEÇÃO DA EQUIPE — a pokébola construída no 1.24 |
| L-122#1 | 5102 | L-122 — O MOBILE, e a pergunta que ninguém tinha feito |
| L-123#1 | 5140 | L-123 — AS DUAS LOJAS, e a moeda de cada uma |
| L-124#1 | 5184 | L-124 — DIA E NOITE, o relógio, e o banner que não anda |
| L-125#1 | 5213 | L-125 — OS NPCs DAS LOJAS, e o som que só toca com a loja aberta |
| L-126#1 | 5309 | L-126 — O POKÉCASH COMPRADO USA CADEADO, e ele já tem onde morar |
| L-127#1 | 5375 | L-127 — O MOBILE É TRILHA PARALELA, e não bloqueia nada |
| L-128#1 | 5414 | L-128 — a criatura DADA conta para a escada — DECIDIDA, conta |
| L-129#1 | 5474 | L-129 — a Pokébola gira, exceto para quem desligou animação no sistema |
| L-130#1 | 5520 | L-130 — a Pokédex abre numa ficha vazia, e a proporção está invertida em 1440 |
| L-131#1 | 5569 | L-131 — o treinador é cortado no topo da cena a 420 px |
| L-132#1 | 5593 | L-132 — a escada da dex é rala no meio e mesquinha no fim |
| L-133#1 | 5659 | L-133 — a Poké Ball estava LARANJA — CORRIGIDA no 1.25 |
| L-134#1 | 5708 | L-134 — `min-width: 320px` no palco garante rolagem lateral abaixo de 320 |
| L-135#1 | 5730 | L-135 — os preços da loja ainda não passaram pelo estudo de economia |
| L-136#1 | 5767 | L-136 — a LOJA POKÉCASH ainda não existe, e o NPC dela já está pronto |
| L-137#1 | 5823 | L-137 — a qualidade dos ícones de item, e ela é 34 e não 368 |
| L-138#1 | 5888 | L-138 — a ESSÊNCIA é 53% de tudo que cai e não tem uso nenhum |
| L-139#1 | 5958 | L-139 — 21 dos 40 itens da wiki têm porta que ainda não existe |
| L-140#1 | 5991 | L-140 — mandar DOIS no mesmo bioma custa o dobro e rende igual |
| L-141#1 | 6052 | L-141 — o QUADRO DE LOG da expedição, e ele já foi pedido duas vezes |
| L-142#1 | 6114 | L-142 — o AVANÇO: as três decisões que o dono ainda precisa tomar |
| L-143#1 | 6195 | L-143 — o VULCÃO não tem gente para quatro estágios |
| L-144#1 | 6255 | L-144 — o LABORATÓRIO: conversado, e sem bloco |
| L-145#1 | 6345 | L-145 — o VÍNCULO é uma barra invisível que agora decide combate |
| L-146#1 | 6501 | L-146 — as decisões do dono sobre o modo ausente, 08/09/2026 |
| L-147#1 | 6538 | L-147 — O BANNER É A IDENTIDADE DO JOGADOR, e ele é indispensável |
| L-148#1 | 6598 | L-148 — a LOJA DE POKÉCASH: as abas, e o inventário do que já é cosmético |
| L-149#1 | 6664 | L-149 — a CAIXA precisa estar no layout novo |
| L-150#1 | 6694 | L-150 — a run acontece na tela e ainda não PAGA nada |
| L-151#1 | 6778 | L-151 — o TETO limita o que a run RENDE, e não o direito de rodá-la |
| L-152#1 | 6848 | L-152 — a DURAÇÃO da run não responde à força, e o dono pegou isso na conta |
| L-153#1 | 6927 | L-153 — o FOCO não entra no Avanço, e os cinco existentes são de expedição |
| L-154#1 | 6970 | L-154 — o modo antigo vira ABA PRÓPRIA, e não uma escolha dentro de ROTAS |
| L-155#1 | 7003 | L-155 — o log da run sabe desenhar item e treinador, e ninguém os emite |
| L-156#1 | 7030 | L-156 — um portão que pegue variável de CSS que não existe |
| L-157#1 | 7051 | L-157 — a posse do traje e a posse dos cosméticos são duas listas |
| L-158#1 | 7086 | L-158 — os 9 trajes são arte NOSSA e nenhum está à venda |
| L-159#1 | 7126 | L-159 — o Estilhaço e o baú do estágio ainda não se conhecem |
| L-160#1 | 7154 | L-160 — o Estilhaço não aparece na mochila nem na wiki |
| L-161#1 | 7176 | L-161 — AS DECISÕES DO DONO DE 09/09/2026, e o que elas desfazem |
| L-162#1 | 7232 | L-162 — a MESMA criatura podia avançar e ir à expedição |
| L-163#1 | 7256 | L-163 — o DESLOGAR da Rota OFF, e o teto de tempo ausente |
| L-164#1 | 7280 | L-164 — o que os vídeos do Baiak mostram, OLHADOS |
| L-166#1 | 7354 | L-166 — a bola saiu da run; o "QUEM APARECEU" é o momento |
| L-167#1 | 7397 | L-167 — `engine/avanco-bola.mjs` ficou sem chamador |
| L-168#1 | 7418 | L-168 — os golpes têm de ser LIBERADOS pelo nível |
| L-169#1 | 7438 | L-169 — quatro por wave, e não seis |
| L-170#1 | 7457 | L-170 — o chefe do estágio vira UM boss, em 1x1, com anúncio |
| L-171#1 | 7489 | L-171 — a arena tem SPRITE DE EFEITO, e o Avanço não |
| L-172#1 | 7559 | L-172 — os números de dano se atropelam |
| L-173#1 | 7613 | L-173 — varrer as ferramentas de plantio por campo DERIVADO escrito à mão |
| L-174#1 | 7633 | L-174 — o portão de navegador não alcança a TELA DA RUN |
| L-175#1 | 7665 | L-175 — em 420 px a janela da câmera tem 130 px de mundo |
| L-176#1 | 7698 | L-176 — o som e o vídeo dos NPCs dão 404 na tela da run |
| L-177#1 | 7723 | L-177 — o jogador não sabe QUE CLIMAS EXISTEM antes de escolher a equipe |
| L-178#1 | 7754 | L-178 — o clima não muda o ELENCO da wave, só o que ela rende |
| L-179#1 | 7779 | L-179 — o Q2 encostou no teto de tempo do dono, e o número do `CLAUDE.md` mente em 3,5x |

### DEFEITOS.md

[Abrir original completo](../historico/original_recebido/DEFEITOS.md)

| Ocorrência | Linha | Título histórico |
|---|---:|---|
| D-001#1 | 12 | D-001 — o caminho rápido do motor perde o vencedor em varredura por tempestade ✅ CORRIGIDO |
| D-002#1 | 80 | D-002 — o nome exibido é usado onde se espera o slug, e quebra o resgate de imagem ✅ CORRIGIDO |
| D-004#1 | 137 | D-004 — o teste do corte por teto encheu a carteira por um campo morto ✅ CORRIGIDO |
| D-005#1 | 187 | D-005 — o teste do relógio dependia da velocidade da máquina ✅ CORRIGIDO |
| D-006#1 | 230 | D-006 — a barra de XP do treinador novo é negativa ✅ CORRIGIDO |
| D-003#1 | 288 | D-003 — o corte duro de tempo é suave ✅ CORRIGIDO |
| D-007#1 | 364 | D-007 — os desafios diários emitem 6,5× o orçamento agregado ✅ CORRIGIDO |
| D-008#1 | 460 | D-008 — a aposta era contada a cada clique, não no fecho da janela ✅ CORRIGIDO |
| D-009#1 | 485 | D-009 — três dos dezesseis avatares de treinador nunca existiram ✅ CORRIGIDO |
| D-010#1 | 512 | D-010 — um componente inteiro cabe sob o limite da linha de base visual ✅ CORRIGIDO |
| D-011#1 | 615 | D-011 — a tela diz 20.000 simulações; o motor roda 154.000 ✅ CORRIGIDO |
| D-012#1 | 679 | D-012 — a tela de resultado comemorava retorno igual ou menor que a aposta ✅ CORRIGIDO |
| D-013#1 | 726 | D-013 — o teste do cooldown comparava a constante consigo mesma ✅ CORRIGIDO |
| D-014#1 | 760 | D-014 — nada exercitava o caminho do settlement até o limite de perda ✅ CORRIGIDO |
| D-015#1 | 788 | D-015 — a passada estreita da sabotagem dava PEGOU falso a todo defeito de navegador ✅ CORRIGIDO |
| D-016#1 | 877 | D-016 — duas sondas de navegador mediam o relógio, e não o produto ✅ CORRIGIDO |
| D-017#1 | 952 | D-017 — `npm run rapido` cobre 21 suítes das 35 que não precisam de navegador ✅ CORRIGIDO |
| D-018#1 | 1003 | D-018 — a raiz da rodada cabia num brute force ✅ CORRIGIDO no F1.15 |
| D-019#1 | 1137 | D-019 — o servidor de produção importa um arquivo de `test/` ✅ CORRIGIDO |
| D-020#1 | 1190 | D-020 — valor ilegível de limite virava PEDIDO DE REMOÇÃO ✅ CORRIGIDO |
| D-021#1 | 1247 | D-021 — testes apostavam valor fixo contra uma rodada de raiz aleatória ✅ CORRIGIDO |
| D-022#1 | 1303 | D-022 — a sonda `sem-rede` espera o Monte Carlo e o teto media a máquina ✅ CORRIGIDO |
| D-023#1 | 1358 | D-023 — sete Chromiums ao mesmo tempo, e o portão parou de terminar ✅ CORRIGIDO |
| D-024#1 | 1422 | D-024 — versionar `assets/` derrubou o portão antes do primeiro defeito ✅ CORRIGIDO |
| D-028#1 | 1464 | D-028 — o cartão `SEU LUTADOR` não tinha CSS nenhum |
| D-029#1 | 1514 | D-029 — o portão de fechamento não passa: ele proíbe o que a própria suíte testa |
| D-030#1 | 1594 | D-030 — clone limpo não sobe: o SQLite não cria o diretório do banco |
| D-031#1 | 1666 | D-031 — o backend escuta só em `127.0.0.1`, e nenhum ajuste de firewall muda isso |
| D-032#1 | 1712 | D-032 — `semTexto` perde a sincronia em literal de expressão regular com aspas |
| D-033#1 | 1767 | D-033 — a linha de base visual fotografa GIF animado, e por isso depende do relógio |
| D-034#1 | 1842 | D-034 — o §4.7 inteiro está construído e nunca é chamado |
| D-035#1 | 1914 | D-035 — a semana do §28.8 era `NaN-WNaN`, e o resgate virou um por conta |
| D-036#1 | 1987 | D-036 — o portão Q2 abandona as caixas de areia quando aborta |
| D-037#1 | 2089 | D-037 — as fontes do tema nunca carregaram: a folha é servida como binário |
| D-038#1 | 2194 | D-038 — a música de batalha pede um arquivo que não existe |
| D-039#1 | 2232 | D-039 — a caixa de areia do Q2 julgava contra uma linha de base velha |
| D-040#1 | 2296 | D-040 — o portão Q2 aborta por variação na região do banner |
| D-041#1 | 2365 | D-041 — a varredura das cenas ignorava movimento reduzido |
| D-042#1 | 2453 | D-042 — movimento reduzido apagava todo aviso da arena |
| D-043#1 | 2534 | D-043 — o painel do protótipo continua sendo desenhado para o vazio |
| D-044#1 | 2588 | D-044 — um teste de aposta depende da odd sorteada, e reprova sozinho |
| D-045#1 | 2679 | D-045 — a progressão do F1.10 está inteira no servidor, e o app nunca a chama |
| D-046#1 | 2809 | D-046 — o portão de módulos é cego a símbolo usado só dentro de template literal |
| D-047#1 | 2913 | D-047 — o modo servidor não tem caminho até o navegador |
| D-048#1 | 2969 | D-048 — o teste do perfil de leitura se declarava determinístico e não era |
| D-049#1 | 3032 | D-049 — o `--tocados` perde o arquivo que foi RENOMEADO |
| D-050#1 | 3089 | D-050 — o portão saiu INSTÁVEL uma vez, e não reproduziu |
| D-051#1 | 3218 | D-051 — o pack original tinha UMA espécie comum, e a suíte inteira estava verde |
| D-053#1 | 3295 | D-053 — o conferidor de módulos lê `let a = 1, b = 2` como símbolo global |
| D-054#1 | 3349 | D-054 — a chave de cor da aba de rotas apagava o contorno de todo outfit |
| D-055#1 | 3395 | D-055 — a vara de pescar colava duas vistas numa célula só |
| D-056#1 | 3433 | D-056 — a base visual local ficou anterior ao botão ROTAS no menu |
| D-057#1 | 3504 | D-057 — a classe `.vivo` colidiu com o letrado da marca, e o logo cobriu o título |
| D-058#1 | 3567 | D-058 — o alargamento do painel da rota nunca chegou a valer |
| D-052#1 | 3613 | D-052 — o teto diário conta EXPEDIÇÕES, e devia contar ENCONTROS |
| D-059#1 | 3707 | D-059 — `--sem-navegador` sobe os cinco Chromium e joga o resultado fora |
| D-060#1 | 3802 | D-060 — `sala-cliente` falha com `fetch failed`, raramente, e aborta o Q2 |
| D-067#1 | 3895 | D-067 — a tela recusa a expedição pelo teto e esconde o número que explica |
| D-068#1 | 3953 | D-068 — `loading="lazy"` nas notas da aposta: a ficha pode aparecer vazia |
| D-069#1 | 3990 | D-069 — o portão visual espera para sempre por uma imagem pendente |
| D-070#1 | 4056 | D-070 — a afirmação da janela de 24 h era satisfeita pela STAMINA |
| D-071#1 | 4113 | D-071 — o título e a legenda da seção colidem a 420 px |
| D-072#1 | 4171 | D-072 — o número de vagas simultâneas era lido do `localStorage` |
| D-073#1 | 4222 | D-073 — o viés do Vigia é comido pelo teto, e o foco fica só com o custo |
| D-074#1 | 4271 | D-074 — um símbolo que eu inventei derrubou a aba de Rotas com a suíte VERDE |
| D-075#1 | 4397 | D-075 — a Pokédex desenhava `007 ? ???` com a Pokébola de "capturada" ao lado |
| D-076#1 | 4447 | D-076 — "menos movimento" apagava a cena da captura inteira |
| D-077#1 | 4522 | D-077 — a suíte `rotas` falhou UMA vez com `fetch failed`, e não reproduziu |
| D-078#1 | 4564 | D-078 — a linha de base visual da ARENA é INSTÁVEL no estreito, e ela aborta o Q2 |
| D-079#1 | 4635 | D-079 — a tela do Avanço pedia sete cores que a paleta não tem |
| D-080#1 | 4701 | D-080 — um teste de limites afirmava o que PEDIU, e não o que conseguiu |
| D-081#1 | 4746 | D-081 — as placas da cena empilham, e a leitura vira mingau |
| D-082#1 | 4784 | D-082 — o rodapé do banner passa por baixo do Pokémon de vitrine |
| D-083#1 | 4807 | D-083 — o número do dano nascia no canto, e não sobre o lutador |
| D-084#1 | 4846 | D-084 — o duelo virou um soco só, e o "-31" nunca teve como aparecer |
| D-085#1 | 4880 | D-085 — apertar uma constante apagou o que um teste enxergava |
| D-086#1 | 4905 | D-086 — `sala-cliente` é INSTÁVEL, e instável é pior que vermelho |
| D-087#1 | 4941 | D-087 — a ferramenta de OLHAR inventava a raridade, e eu usei a foto como prova |
| D-088#1 | 4989 | D-088 — `pintarPrevia` chamava um `escrever` que não é dela |
| D-089#1 | 5028 | D-089 — a cena inteira morreu, e a suíte ficou VERDE |
| D-090#1 | 5081 | D-090 — o baixador de arte só cobria o elenco da ARENA |
| D-091#1 | 5149 | D-091 — a escolha da folha perguntava à TABELA, e a tabela não sabe o que existe |
| D-092#1 | 5199 | D-092 — o estouro era posto em coordenada de TELA e pintado num canvas de MUNDO |
| D-093#1 | 5254 | D-093 — a linha de base visual LOCAL é invisível ao git, e envelhece calada |
| D-094#1 | 5355 | D-094 — um script de reversão duplicou 3 725 linhas do `app/index.html` |
| D-095#1 | 5434 | D-095 — os `tools/` calculam a raiz por um idioma que só existe no Windows |
| D-096#1 | 5508 | D-096 — a passada ESTREITA do Q2 escrevia a linha de base que ela deveria só consultar |
| D-097#1 | 5585 | D-097 — o portão reprova a si mesmo: quatro navegadores em quatro núcleos |
| D-098#1 | 5664 | D-098 — o booleano do navegador era grosso demais, e subia sete sondas para ler uma |
| D-099#1 | 5749 | D-099 — a tela da arena não reproduz ✅ RESOLVIDO, e a resolução é uma DESISTÊNCIA MEDIDA |
| D-100#1 | 5865 | D-100 — o portão afoga a máquina e lê o afogamento como captura |
| D-101#1 | 5938 | D-101 — o portão era dependência de si mesmo, e consertá-lo custava o portão inteiro |
| D-103#1 | 6029 | D-103 — as guardas do S109 eram decorativas, e o portão provou |
| D-104#1 | 6096 | D-104 — a digital de pixel fazia o trabalho de cinco asserções que ninguém escreveu |
| D-105#1 | 6174 | D-105 — o `modulos` não entende literal de expressão regular, e a âncora `$` vira "usa sem importar" |
| D-106#1 | 6246 | D-106 — a exclusão do `ARNES` não vale para quem tem fecho `TUDO` |

[Versão estruturada do inventário](../support/revisao/registros_legados.json).
