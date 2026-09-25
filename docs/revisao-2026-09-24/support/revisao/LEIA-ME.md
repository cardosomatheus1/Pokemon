# Evidências da revisão documental

- 27 documentos originais, 1.406.872 bytes: hashes preservados.
- ZIP original preservado sem alteração.
- 180 ocorrências de lacunas (178 IDs distintos) e 96 de defeitos (96 IDs): inventariadas sem fusão de duplicatas.
- Links locais da documentação nova/redirecionada: conferidos.
- Identidade binomial: verificada contra soma direta em 32 casos pequenos.
- Três cenários financeiros hipotéticos: calculados a partir de premissas editáveis.

## Reproduzir

A partir da raiz do pacote, com Python 3 e biblioteca padrão:

```bash
python3 support/revisao/verificar_calculos.py
python3 support/revisao/verificar_pacote.py
```

O primeiro atualiza os resultados e a tabela financeira; o segundo confere originais, inventário e links. Se mudar as premissas, o relatório executivo estático precisa ser atualizado para refletir a nova tabela. Nenhum desses comandos testa o motor, a API ou o navegador do jogo.

## Arquivos

- `premissas.json`: entradas econômicas hipotéticas.
- `resultados.json` / `CALCULOS_CONFERIDOS.md`: saídas dos cálculos.
- `inventario_originais.json`: destino e SHA-256 dos 27 originais.
- `registros_legados.json`: cada ocorrência de lacuna/defeito, título e localização.
- `sha256_zip_original.txt`: hash do arquivo recebido.
- `verificacao_pacote.json`: resultado da conferência estrutural.
