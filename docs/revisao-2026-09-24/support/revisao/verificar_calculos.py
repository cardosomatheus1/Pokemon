#!/usr/bin/env python3
"""Confere matematica documental e calcula cenarios hipoteticos. Nao executa o jogo.

Uso: python3 support/revisao/verificar_calculos.py
Saidas ao lado deste arquivo: resultados.json e CALCULOS_CONFERIDOS.md.
Somente biblioteca padrao; entradas financeiras em premissas.json.
"""
from pathlib import Path
from decimal import Decimal, ROUND_CEILING
import json
import math

ROOT = Path(__file__).resolve().parent
D = Decimal


def expectativa_laplace(n, p, k):
    return (n + k) * (-math.expm1((n + 1) * math.log1p(-p))) / ((n + 1) * p)


def verificar_identidade():
    casos = 0
    for n in (1, 4, 10, 30):
        for p in (0.016, 0.2, 0.5, 0.9):
            for k in (2, 12):
                direto = sum(math.comb(n, x) * p**x * (1-p)**(n-x)
                             * (n+k)/(x+1) for x in range(n+1))
                assert math.isclose(direto, expectativa_laplace(n,p,k), rel_tol=1e-12)
                casos += 1
    return casos


def financeiro(config):
    resultados = []
    mau = D(config['mau_exemplo'])
    for c in config['cenarios']:
        pedidos_cosm = D(c['conversao_cosmetico']) * D(c['pedidos_por_comprador'])
        pedidos_passe = D(c['adesao_passe'])
        receita_cosm = pedidos_cosm * D(c['ticket_cosmetico'])
        receita_passe = pedidos_passe * D(config['preco_passe'])
        receita = receita_cosm + receita_passe
        taxas = receita * D(config['taxa_pagamento_percentual']) + (pedidos_cosm + pedidos_passe) * D(config['taxa_pagamento_por_pedido'])
        tributos = receita * D(config['tributos_sobre_receita_bruta_hipoteticos'])
        devolucoes = receita * D(config['devolucoes_fracao_receita'])
        perdas = receita * D(config['perdas_adicionais_fracao_receita'])
        variavel = D(config['custo_variavel_por_mau'])
        contribuicao = receita-taxas-tributos-devolucoes-perdas-variavel
        equilibrio = {f: int((D(f)/contribuicao).to_integral_value(rounding=ROUND_CEILING)) if contribuicao > 0 else None for f in config['sensibilidade_custo_fixo']}
        resultados.append({
            'cenario':c['nome'],
            'receita_cosmetico_por_mau':str(receita_cosm),
            'receita_passe_por_mau':str(receita_passe),
            'receita_bruta_por_mau':str(receita),
            'taxas_por_mau':str(taxas), 'tributos_hipoteticos_por_mau':str(tributos),
            'devolucoes_por_mau':str(devolucoes), 'perdas_adicionais_por_mau':str(perdas),
            'custo_variavel_por_mau':str(variavel),
            'contribuicao_por_mau':str(contribuicao),
            'resultado_operacional_mau_exemplo':str(contribuicao*mau-D(config['custo_fixo_mensal'])),
            'mau_equilibrio_por_custo_fixo':equilibrio,
        })
    return resultados


def main():
    config = json.loads((ROOT/'premissas.json').read_text())
    p,n,k = 0.016,20000,12
    calc = {
        'p_referencia':p, 'n_referencia':n, 'k_referencia':k,
        'odd_justa':1/p,
        'vies_absoluto_delta_estimador_puro':(1-p)/(n*p*p),
        'vies_relativo_delta_estimador_puro':(1-p)/(n*p),
        'vies_relativo_laplace_20000':expectativa_laplace(n,p,k)*p-1,
        'vies_relativo_laplace_154000':expectativa_laplace(154000,p,k)*p-1,
        'erro_padrao_relativo_154000':math.sqrt((1-p)/(154000*p)),
        'n_normal_95_meia_largura_relativa_2pct':math.ceil(1.96**2*(1-p)/(p*0.02**2)),
        'overround_margem_8pct':0.08/0.92,
        'p_piso_105_reduz_margem_8pct':0.92/1.05,
        'p_piso_105_gera_ev_positivo':1/1.05,
        'cpu_segundos_rodada_historica':154000*23e-6,
        'cpu_horas_mes_43200_rodadas':154000*23e-6*43200/3600,
        'equilibrio_historico_75000_div_312':str(D('75000')/D('3.12')),
        'equilibrio_historico_87000_div_2908':str(D('87000')/D('2.908')),
        'taxa_ilustrativa_ticket_5':str((D('5')*D('.03')+D('.40'))/D('5')),
        'taxa_ilustrativa_ticket_20':str((D('20')*D('.03')+D('.40'))/D('20')),
        'mobs_run_sem_retries':9*4+1,
        'stamina_base_run_sem_retries':9*2+5,
        'casos_identidade_binomial_verificados':verificar_identidade(),
    }
    assert math.isclose(calc['vies_absoluto_delta_estimador_puro'],.1921875)
    assert math.isclose(calc['vies_relativo_delta_estimador_puro'],.003075)
    assert calc['n_normal_95_meia_largura_relativa_2pct']==590646
    assert math.isclose(calc['cpu_horas_mes_43200_rodadas'],42.504)
    fin = financeiro(config)
    resultado={'escopo':'Verificacao documental; nao teste do jogo nem reproducao do estudo original.', 'calculos':calc, 'financeiro_hipotetico':fin}
    (ROOT/'resultados.json').write_text(json.dumps(resultado,ensure_ascii=False,indent=2)+'\n')
    linhas=['# Cálculos conferidos — revisão 2.0','',
        'Gerado por `verificar_calculos.py`, sem dependências externas. Não executa o motor do jogo. Reexecutar após alterar `premissas.json`.','',
        '## Matemática e capacidade','',
        '| Grandeza | Resultado | Hipótese/limite |','|---|---:|---|',
        f"| Viés absoluto aproximado da odd | {calc['vies_absoluto_delta_estimador_puro']:.7f} | p=0,016; n=20.000; método delta |",
        f"| Viés relativo aproximado | {calc['vies_relativo_delta_estimador_puro']*100:.4f}% | Estimador puro, aproximação longe de zero |",
        f"| Viés relativo Laplace, n=20.000 | {calc['vies_relativo_laplace_20000']*100:.5f}% | Binomial IID; K=12 |",
        f"| Viés relativo Laplace, n=154.000 | {calc['vies_relativo_laplace_154000']*100:.5f}% | Binomial IID; K=12 |",
        f"| Erro-padrão relativo, n=154.000 | {calc['erro_padrao_relativo_154000']*100:.4f}% | Não é cobertura de 95% |",
        f"| n para meia-largura relativa de 2%, normal 95% | {calc['n_normal_95_meia_largura_relativa_2pct']} | Marginal; não cobre simultaneamente todas as seleções |",
        f"| Overround com margem 8% | {calc['overround_margem_8pct']*100:.4f}% | Sem piso/arredondamento; probabilidades somam 1 |",
        '| CPU por rodada / mês | 3,542 s / 42,504 h | Extrapolação histórica; 43.200 rodadas; não benchmark novo |',
        '| Mob / stamina-base | 37 / 23 | Run sem derrota; conferir implementação |','',
        f"A identidade exata de Laplace foi comparada com soma binomial direta em {calc['casos_identidade_binomial_verificados']} casos pequenos. Isso verifica a derivação, não o RNG nem a amostragem real do jogo.",'',
        '## Modelo de conteúdo: hipóteses, não previsão','',
        'Sem venda de moeda apostável e sem receita de RMT. Custos hipotéticos: pagamento 3% + R$ 0,40/pedido; tributos 8% da receita bruta; devoluções 2%; perdas adicionais 0,5%; variável R$ 0,30/MAU. Taxas e tributos não são recalculados sobre devoluções nesta simplificação. Custo fixo principal R$ 15.000/mês. Passe R$ 29,90. CAC e investimento inicial não incluídos.','',
        '| Cenário | Conversão cosmético | Pedidos/comprador | Ticket | Adesão passe |','|---|---:|---:|---:|---:|']
    for c in config['cenarios']:
        linhas.append(f"| {c['nome']} | {D(c['conversao_cosmetico'])*100}% | {c['pedidos_por_comprador']} | R$ {c['ticket_cosmetico']} | {D(c['adesao_passe'])*100}% |")
    linhas += ['', '| Cenário | Receita/MAU | Contribuição/MAU | Resultado com 5.000 MAU | MAU de equilíbrio (fixo R$ 15 mil) |','|---|---:|---:|---:|---:|']
    for r in fin:
        linhas.append(f"| {r['cenario']} | R$ {D(r['receita_bruta_por_mau']):.3f} | R$ {D(r['contribuicao_por_mau']):.5f} | R$ {D(r['resultado_operacional_mau_exemplo']):.2f} | {r['mau_equilibrio_por_custo_fixo']['15000']} |")
    linhas += ['', 'Contribuição pequena torna o equilíbrio extremamente sensível. Não inferir que uma comunidade atingirá esses tamanhos ou conversões. Usuários que compram ambos os produtos não são dois pagantes únicos.', '',
        '| Cenário | Fixo R$ 5 mil | Fixo R$ 15 mil | Fixo R$ 30 mil |','|---|---:|---:|---:|']
    for r in fin:
        e=r['mau_equilibrio_por_custo_fixo']
        linhas.append(f"| {r['cenario']} | {e['5000']} | {e['15000']} | {e['30000']} |")
    linhas += ['', 'Valores de equilíbrio arredondados para cima. Se a contribuição ficar não positiva, o JSON retorna `null`: aumentar MAU não resolve aquele modelo. Custos variáveis podem deixar de ser lineares ao escalar; recalcular por faixa.', '',
        '## Estudos anteriores','',
        f"Com entradas publicadas arredondadas: 75.000 / 3,12 = {calc['equilibrio_historico_75000_div_312']} e 87.000 / 2,908 = {calc['equilibrio_historico_87000_div_2908']}. Diferenças pequenas dos resultados antigos podem vir de arredondamento; sem os scripts originais, não há reprodução exata.", '',
        'Exemplo de taxas: 3% + R$ 0,40 representa 11% de ticket R$ 5 e 5% de ticket R$ 20. Isso compara custo por pedido, não conversão ou contribuição por visitante.', '',
        '## O que ainda precisa ser medido','',
        'Simulação do motor, fontes/sinks por perfil, progressão 7/30/90/180 dias, benchmark atual, retenção, preços, conversão, suporte e contratos de taxas reais. O modelo fornecido torna as hipóteses editáveis; não preenche essas lacunas com evidência inventada.', '']
    (ROOT/'CALCULOS_CONFERIDOS.md').write_text('\n'.join(linhas))
    print(json.dumps({'calculos':'OK','casos_binomiais':calc['casos_identidade_binomial_verificados'],'cenarios':len(fin)},ensure_ascii=False))


if __name__=='__main__':
    main()
