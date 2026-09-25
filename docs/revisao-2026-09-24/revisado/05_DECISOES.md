# Registro de decisões

Revisão de 24/09/2026. Estas são propostas para decisão futura; a produção deste plano não equivale à aprovação de novos preços, regras de save, distribuição pública ou dinheiro real. Responsáveis são papéis a designar, não pessoas presumidas na equipe.

## Decisões que precisam ficar explícitas

| ID | Questão e evidência | Recomendação | Quem decide | O que depende dela / padrão enquanto aberta |
|---|---|---|---|---|
| DEC-01 | Como explorar o tema Pokémon e os assets? Não há licença no pacote; premissa recente preserva a franquia | Inventariar marca, sprites, áudio, vídeo e origem; obter avaliação e direitos necessários para o uso pretendido. Manter a escolha criativa explícita | Dono + assessoria de IP | Distribuição/comercialização. Não presumir que ser gratuito ou privado concede permissão; continuar apenas trabalho compatível com o escopo autorizado |
| DEC-02 | RMT é requisito estratégico, mas formato e enquadramento estão indefinidos | Desenhar fluxos de entrada, aposta, prêmio, revenda, repasse e saque; validar cada um com assessoria e PSP. Definir se há operador, marketplace, comprador/vendedor e responsabilidade de disputa | Dono + jurídico + financeiro/pagamentos | Produção de mercado/repasse real. Enquanto aberto: protótipo isolado com valores fictícios e sem promessa de conversão |
| DEC-03 | O compromisso P5 proíbe influência de pagamento sobre poder? Lucro de stake comprado e materiais negociáveis criam rotas indiretas | Adotar matriz restritiva do documento econômico e rastrear origem. Se preferir permitir aceleração paga, revisar expressamente P5, ranking e comunicação | Dono/produto | Laboratório pago, mercado de materiais e moedas. Não converter nem liberar saldo automaticamente |
| DEC-04 | Qual tempo de progressão e curva de B1–B7? L-144 registra dependência anterior | Prototipar B1 com tempo-alvo medido e custo de recursos concorrentes; ampliar só após observar uso e inflação | Produto + economia | Implementação ampla do laboratório. Não inferir “50% grátis” de material representando 60% do tempo |
| DEC-05 | Vulcão sem raro elegível: lacuna de conteúdo ou escolha? | Auditar o pool de 14 espécies reportado. Preservar identidade de bioma; não adicionar raro apenas para satisfazer quota | Produto + conteúdo/arte | Expansão de conteúdo daquele bioma; não bloqueia resolver genérico com fallback |
| DEC-06 | Outfits/arte pausadas devem ser vendidas agora? L-158 registra nove sem oferta | Manter pausa; vender só com catálogo, posse, assets e proposta de valor completos | Dono/produto + arte | Ampliação da loja; não bloqueia corrigir persistência do que já existe |
| DEC-07 | OFF “desloga” da experiência ou revoga autenticação? | Encerrar presença ativa/ocupação conforme regra e permitir retorno autenticado; não derrubar todos os dispositivos sem intenção explícita | Produto + desenvolvimento | Comportamento de sessão ao enviar OFF. Confirmar implementação antes de mudar |
| DEC-08 | Capturar a espécie encontrada ou sempre a base evolutiva? Textos divergem | No Avanço, entregar a espécie elegível mostrada, com probabilidade/regra explícita; preservar outras modalidades até reconciliar | Produto | Migração de coleção, drops e economia de doces. Nenhuma alteração retroativa de posse |
| DEC-09 | Stamina por tentativa iniciada ou vitória? O total 23 ignora repetição | Cobrar por tentativa iniciada e mostrar custo-base + custo de nova tentativa; se a versão real cobrar diferente, tratar como mudança de balanceamento | Produto + economia | Regra de retries e conteúdo de UI; não recontabilizar gasto passado |
| DEC-10 | Prévia exata é compatível com clima oculto? Qual fuso/período governa o mundo? | Possibilidades antes; elenco efetivo depois. Período congelado no início; fuso explícito. UTC 06h/18h é só padrão de protótipo, subordinado à regra vigente confirmada | Produto + desenvolvimento | 1.33/1.34; pode implementar resolver com contexto injetado antes da escolha de apresentação |

## Decisões de processo propostas nesta revisão

| ID | Regra | Justificativa |
|---|---|---|
| GOV-01 | ROADMAP é a única fila; RETOMAR é o único estado de continuação | Documentos antigos ordenavam reabrir tarefas reportadas como concluídas |
| GOV-02 | Confirmar código em BASE-01 antes de usar estados históricos como atuais | O ZIP contém apenas planejamento |
| GOV-03 | Congelar expansão do harness; permitir correção indispensável com orçamento | Histórico relata concentração excessiva de trabalho em ferramentas |
| GOV-04 | “Implementado”, “validado com usuários” e “pronto para comercializar” são estados distintos | Testes técnicos não demonstram retenção, margem ou autorização |
| GOV-05 | Preservar registros históricos e IDs duplicados com ocorrência própria | Evitar apagar evidência ou fundir causas diferentes |

## Modelo de registro de decisão efetiva

Ao resolver um item, adicionar data, decisor, opção escolhida, alternativas descartadas, evidência, impacto em comportamento/saves/economia, plano de migração e arquivos afetados. Marcar a proposta anterior como substituída sem apagar sua justificativa. Uma decisão só é operacional quando seus critérios estão refletidos no cartão e nos contratos pertinentes.

Exemplo de evidência insuficiente: “foi decidido em conversa” sem a regra concreta. Evidência útil: “preview mostra possibilidades até a run existir; resposta de criação revela o elenco; runs antigas mantêm versão anterior; nenhuma porcentagem será exibida no primeiro corte”.

## Ordem de resolução

Durante M0: confirmar DEC-07/08/09 e a regra vigente de DEC-10. DEC-01/02/03 podem avançar em paralelo, antes de investimento em produção comercial. DEC-04/05/06 entram quando seu bloco estiver próximo; não paralisar a correção de uma jornada por uma decisão distante de conteúdo.
