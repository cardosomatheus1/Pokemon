"""PokéArena unit economics sensitivity model v1.2.

Substitui a v1.1. Acrescenta os dois cenários que o Estudo v1.2 introduziu e que
até aqui existiam só como números no documento, sem serem reproduzíveis:

  §6.1  regime regulatório restritivo — sem PC-T comprável
  §11.1 custo de conformidade e proteção do jogador

Modelo de planejamento. Recalibrar com coortes reais, enquadramento fiscal,
mix de pagamento e dados de fraude.

Uso:  python3 pokearena_unit_economics_model_v1.2.py
Gera: unit_economics_scenarios_v1_2.csv
      restricted_regime_break_even.csv
      compliance_cost_sensitivity.csv
      combined_worst_case.csv
"""
import math
import pandas as pd

# ----------------------------------------------------------------- baseline
PC_PER_BRL = 10.0
PAYMENT_FEE_RATE = 0.027009774436090227   # mix 60% Pix / 40% cartão, ticket ~R$39,90
REFUND_FRAUD_RESERVE = 0.015
TAX_PLACEHOLDER = 0.08
VARIABLE_COST_PER_MAU = 0.30
NET_FACTOR = 1 - PAYMENT_FEE_RATE - REFUND_FRAUD_RESERVE - TAX_PLACEHOLDER

SCENARIOS = {
    "Conservador": dict(econ_rate=.04, sink_pc=220, replen=.65, pass_pen=.015, pass_price=29.90, cos_pen=.008, cos_ticket=20.0),
    "Base":        dict(econ_rate=.08, sink_pc=344, replen=.80, pass_pen=.04,  pass_price=29.90, cos_pen=.02,  cos_ticket=24.90),
    "Forte":       dict(econ_rate=.15, sink_pc=500, replen=.90, pass_pen=.08,  pass_price=29.90, cos_pen=.04,  cos_ticket=29.90),
}

# --------------------------------- conformidade e proteção (§11.1) ---------
# Hipóteses de planejamento, NÃO cotações. Ver o estudo para a discussão.
RG_TOOLING_PER_MAU     = 0.08     # ferramenta, monitoramento, operação
AGE_VERIFICATION_UNIT  = 2.50     # por usuário economicamente ativo, uma vez
AGE_VERIFICATION_MONTHS = 12      # amortização
COMPLIANCE_FIXED_ADD   = 12000.0  # compliance parcial, jurídico, auditoria
PROTECTION_VOLUME_DRAG = 0.06     # receita de PC-T que não se realiza por desenho

FIXED_COSTS = [30000, 75000, 110000, 150000]
REFERENCE_FIXED = 75000


def arpmau(s, *, pc_t=True, drag=0.0):
    """ARPMAU bruto. pc_t=False simula o regime restrito do §6.1."""
    pct = s['econ_rate'] * (s['sink_pc'] / PC_PER_BRL) * s['replen'] * (1 - drag) if pc_t else 0.0
    return pct, s['pass_pen'] * s['pass_price'], s['cos_pen'] * s['cos_ticket']


def contribution(s, *, pc_t=True, drag=0.0, compliance=False):
    pct, pas, cos = arpmau(s, pc_t=pc_t, drag=drag)
    gross = pct + pas + cos
    net = gross * NET_FACTOR
    c = net - VARIABLE_COST_PER_MAU
    if compliance:
        c -= RG_TOOLING_PER_MAU
        if pc_t:      # sem valor econômico real, verificação documental não é exigível
            c -= s['econ_rate'] * AGE_VERIFICATION_UNIT / AGE_VERIFICATION_MONTHS
    return dict(gross=gross, net=net, contribution=c)


be = lambda c, fixed: math.ceil(fixed / c) if c > 0 else float('inf')

# ------------------------------------------------------------- 1. cenários
rows = []
for name, s in SCENARIOS.items():
    for label, kw, fixed in [
        ("atual",                dict(),                                        REFERENCE_FIXED),
        ("restrito (§6.1)",      dict(pc_t=False),                              REFERENCE_FIXED),
        ("com conformidade",     dict(compliance=True, drag=PROTECTION_VOLUME_DRAG),
                                                        REFERENCE_FIXED + COMPLIANCE_FIXED_ADD),
        ("restrito + conformidade", dict(pc_t=False, compliance=True),
                                                        REFERENCE_FIXED + 4000),
    ]:
        r = contribution(s, **kw)
        rows.append(dict(Cenario=name, Regime=label,
                         ARPMAU_bruto=round(r['gross'], 4),
                         ARPMAU_liquido=round(r['net'], 4),
                         Contribuicao_por_MAU=round(r['contribution'], 4),
                         Custo_fixo=fixed,
                         Break_even_MAU=be(r['contribution'], fixed)))
df = pd.DataFrame(rows)
df.to_csv('unit_economics_scenarios_v1_2.csv', index=False)

# ------------------------------------------- 2. regime restrito por custo fixo
rows = []
for fixed in FIXED_COSTS:
    row = {'Custo_fixo_mensal_R$': fixed}
    for name, s in SCENARIOS.items():
        row[name] = be(contribution(s, pc_t=False)['contribution'], fixed)
    rows.append(row)
pd.DataFrame(rows).to_csv('restricted_regime_break_even.csv', index=False)

# ------------------------------------------- 3. sensibilidade da conformidade
rows = []
s = SCENARIOS['Base']
for drag in (0.0, 0.03, 0.06, 0.10, 0.15):
    c = contribution(s, compliance=True, drag=drag)['contribution']
    rows.append(dict(protection_volume_drag=drag, Contribuicao_por_MAU=round(c, 4),
                     Break_even_MAU=be(c, REFERENCE_FIXED + COMPLIANCE_FIXED_ADD)))
for fx in (0, 6000, 12000, 25000):
    c = contribution(s, compliance=True, drag=PROTECTION_VOLUME_DRAG)['contribution']
    rows.append(dict(protection_volume_drag=PROTECTION_VOLUME_DRAG,
                     Contribuicao_por_MAU=round(c, 4),
                     Custo_fixo_adicional=fx,
                     Break_even_MAU=be(c, REFERENCE_FIXED + fx)))
pd.DataFrame(rows).to_csv('compliance_cost_sensitivity.csv', index=False)

# ------------------------------------------------------- 4. pior caso combinado
rows = []
for name, s in SCENARIOS.items():
    c = contribution(s, pc_t=False, compliance=True)['contribution']
    rows.append(dict(Cenario=name, Contribuicao_por_MAU=round(c, 4),
                     Custo_fixo=REFERENCE_FIXED + 4000,
                     Break_even_MAU=be(c, REFERENCE_FIXED + 4000),
                     Multiplo_vs_atual=round(
                         be(c, REFERENCE_FIXED + 4000) /
                         be(contribution(s)['contribution'], REFERENCE_FIXED), 2)))
pd.DataFrame(rows).to_csv('combined_worst_case.csv', index=False)

if __name__ == '__main__':
    print(df.to_string(index=False))
    print()
    for name in SCENARIOS:
        a = be(contribution(SCENARIOS[name])['contribution'], REFERENCE_FIXED)
        r = be(contribution(SCENARIOS[name], pc_t=False)['contribution'], REFERENCE_FIXED)
        print(f'{name:<12} atual {a:>7,} MAU   restrito {r:>7,} MAU'.replace(',', '.'))
