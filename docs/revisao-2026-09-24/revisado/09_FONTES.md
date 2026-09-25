# Fontes e limites da revisão

Consulta: 24–25/09/2026 (conforme fuso). O pacote original é a fonte das regras, históricos e números do projeto. As páginas públicas abaixo foram usadas para checar pontos específicos; não substituem análise do produto concreto. Não há afirmação de licença, enquadramento jurídico ou contrato de pagamentos aprovado.

| Fonte primária | Uso e limite |
|---|---|
| [Pokémon Support — uso de imagens ou materiais](https://support.pokemon.com/hc/en-us/articles/360000634094-Can-I-use-Pok%C3%A9mon-images-or-materials) | A orientação pública não concede licença geral para associar os materiais a um projeto. O pacote não demonstra direitos de exploração. Não permite concluir que uma negociação específica será possível ou impossível |
| [Ministério da Fazenda — tipos de jogos on-line](https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/apostas-de-quota-fixa/questoes-tecnicas/quais-tipos-de-jogos-on-line) | A FAQ distingue o regime de quota fixa de categorias como habilidade, fantasy e jogos multiapostador. Estar fora daquele regime não equivale a autorização geral; a classificação exige examinar o fluxo e a influência dos participantes |
| [Ministério da Fazenda — FAQ 67](https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/apostas-de-quota-fixa/questoes-tecnicas/67-os-jogos-on-line-que) | A orientação trata de oferta de jogos fora do escopo por operadores de quota fixa. Não usar o rótulo de marketplace ou ausência de saque como conclusão jurídica automática |
| [WHATWG — Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html) | O construtor nativo de EventSource recebe URL e opção de credenciais, sem parâmetro para cabeçalhos arbitrários. Motiva conciliar `x-api-versao` com o mecanismo de streaming |
| [Node.js — SQLite](https://nodejs.org/api/sqlite.html) | DatabaseSync executa de forma síncrona. Isso exige considerar bloqueio do processo; não prova que o banco existente está lento nem recomenda uma migração automática de runtime |
| [W3C — Understanding SC 2.2.2, Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Orienta controles para movimento automático persistente nas condições do critério. Não é proibição universal de animação; diferenciar conteúdo essencial, duração e interação |

## Matemática e finanças

As correções de viés, erro padrão, margem/overround e capacidade são derivações explícitas sob hipóteses descritas. O script em `support/revisao/verificar_calculos.py` usa somente a biblioteca padrão do Python e gera resultados reproduzíveis. Não reproduz o motor do jogo, a amostragem original, as taxas do PSP ou a receita real.

Valores de taxa, impostos, preço, conversão e custo nos cenários revisados são entradas hipotéticas editáveis. Nenhum é cotação, benchmark de mercado ou orientação tributária. Os estudos originais ficam preservados, inclusive onde há discordância; a revisão explica a divergência em vez de apagar a evidência.

## Evidência ausente

Código, commits verificáveis, database/schema real, assets, logs, testes, simulações originais, métricas de jogadores, contratos e licenças não foram fornecidos neste pacote. Afirmações de implementação são rotuladas como históricas/reportadas e devem passar por BASE-01.
