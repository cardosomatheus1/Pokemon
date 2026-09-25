# Instruções de trabalho — planejamento revisado

Este arquivo destina-se ao trabalho futuro no repositório do jogo. A revisão deste pacote não executou esse repositório. Data: 24/09/2026.

## Ordem de leitura e autoridade

Ler `COMECE_AQUI.md`, `RETOMAR.md`, `ROADMAP.md` e o cartão ativo. Para regras, usar `revisado/02_ESPECIFICACAO.md`, `03_ECONOMIA_E_NEGOCIO.md` e `04_ARQUITETURA_E_API.md`. Decisões abertas estão em `05_DECISOES.md`. Documentos em `historico/` são evidência, não fila de execução. Uma preferência explicitamente dada pelo dono do projeto prevalece sobre esta proposta documental; registrar a alteração afetada.

## Forma de executar

1. Confirmar objetivo e critérios do cartão, estado do checkout e mudanças locais. Não sobrescrever trabalho alheio.
2. Localizar os módulos reais antes de editar. Distinguir comportamento existente, afirmação histórica e proposta nova.
3. Fazer a menor alteração coesa que entrega o comportamento completo ao jogador.
4. Verificar o risco alterado com evidência relevante; corrigir regressão encontrada.
5. Registrar resultado com commit/versão, limitações e próximo item único.

Uma entrega ativa por vez. Ferramentas só entram quando há impedimento reproduzido ao ticket. Definir orçamento antes, interromper expansão de escopo depois de dois ciclos sem avanço e apresentar uma alternativa concreta. Não criar trilhas para melhorar a própria medição enquanto a jornada continua sem ser observada.

## Restrições preservadas

- Manter a stack e zero dependências de produção, salvo decisão explícita do projeto. Ferramentas externas já previstas, como automação de navegador, não devem ser confundidas com dependências embarcadas.
- Engine puro e sem nomes da franquia; conteúdo e assets no pack.
- Não substituir assets escolhidos por versões “parecidas”, redesenhar telas ou alterar balanceamento fora do cartão.
- Não declarar defeito resolvido só porque o teste deixou de executá-lo. Não remover uma verificação relevante para produzir verde.
- Não adicionar poder pago, desbloqueio indireto via saldo comprado ou caixa aleatória paga por interpretação de uma lacuna documental.
- Não inferir permissão comercial de IP ou dinheiro real a partir de uma implementação técnica concluída.

## Verificação proporcional

Reutilizar Q1–Q9 onde pertinentes e confirmar seu significado na versão real. Não reconstruir o catálogo a partir deste ZIP. Q1/Q2 históricos são evidência datada. Teste direcionado e teste total são rótulos diferentes; tempo com cache não representa clone frio.

| Alteração | Verificação mínima pertinente |
|---|---|
| Texto de planejamento | Referências, decisões, links e consistência; não rodar o jogo inteiro |
| Regra pura | Exemplos de fronteira e invariantes independentes da implementação |
| Saldo, item ou resgate | Transação, concorrência, repetição e recuperação após falha |
| API/stream | Contrato, autenticação, reconexão e cliente real |
| UI | Jornada real no navegador; leitura visual e interação nos tamanhos necessários |
| Ferramenta de teste | Caso que demonstra a falha original e caso que não deve falhar |

Mutação que termina por timeout é inconclusiva salvo prova de que esse timeout é o efeito esperado detectado pelo teste. Baseline visual ausente é “não comparado”, não aprovação. Resultado parcial deve dizer o que não executou. Não criar teste que apenas repete a implementação ou existe para atingir uma contagem.

Cache de verificação precisa identificar fontes e testes efetivamente usados, configuração, argumentos/flags, runtime, versão das ferramentas e ambiente relevante (incluindo navegador/OS quando influenciam o resultado). Mudança de entrada não representada invalida a alegação de equivalência. Registrar separadamente execução fria, quente sem alteração e alteração real; a meta de duração não está cumprida para todos os casos só porque o caminho quente ficou rápido. Se não houver prova de validade, classificar o cache como auxiliar e executar a verificação pertinente.

Se revisão independente fizer parte do processo existente, limitar a duas rodadas focadas em falhas concretas de correção, integração ou produto. Notas subjetivas e busca de “10/10” não são critério de encerramento. A evidência deve ser reproduzível por outro mantenedor.

## Atualização de estado

`RETOMAR.md`: estado confirmado, último resultado e próximo passo. `ROADMAP.md`: fila e dependências. Registro de decisão: opção, justificativa e impacto. Problemas históricos permanecem preservados e referenciados; não editar retroativamente sua narrativa para parecer que sempre estiveram resolvidos.

Formato de fechamento: “Entregue X; verificado por Y na versão Z; pendente W; próximo item K”. Quando o ambiente impedir verificação, descrever o impedimento e não usar “pronto/testado”.
