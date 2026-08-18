"""PokéArena unit economics sensitivity model v1.1.
Planning model only. Recalibrate with actual cohorts, tax/accounting, payment mix and fraud data.
"""
import math
import pandas as pd

PC_PER_BRL = 10.0
PAYMENT_FEE_RATE = 0.027009774436090227  # modeled 60% Pix / 40% card around R$39.90 ticket
REFUND_FRAUD_RESERVE = 0.015
TAX_PLACEHOLDER = 0.08
VARIABLE_COST_PER_MAU = 0.30

SCENARIOS = {
    "Conservador": dict(econ_rate=.04, sink_pc=220, replen=.65, pass_pen=.015, pass_price=29.90, cos_pen=.008, cos_ticket=20.0),
    "Base": dict(econ_rate=.08, sink_pc=344, replen=.80, pass_pen=.04, pass_price=29.90, cos_pen=.02, cos_ticket=24.90),
    "Forte": dict(econ_rate=.15, sink_pc=500, replen=.90, pass_pen=.08, pass_price=29.90, cos_pen=.04, cos_ticket=29.90),
}

def scenario(name, s):
    pct_arp = s['econ_rate'] * (s['sink_pc']/PC_PER_BRL) * s['replen']
    pass_arp = s['pass_pen'] * s['pass_price']
    cos_arp = s['cos_pen'] * s['cos_ticket']
    gross = pct_arp + pass_arp + cos_arp
    net = gross * (1-PAYMENT_FEE_RATE-REFUND_FRAUD_RESERVE-TAX_PLACEHOLDER)
    contribution = net - VARIABLE_COST_PER_MAU
    return dict(Cenario=name, PC_T_ARPMAU=pct_arp, Pass_ARPMAU=pass_arp,
                Cosmeticos_ARPMAU=cos_arp, ARPMAU_bruto=gross,
                ARPMAU_liquido_planejamento=net, Contribuicao_por_MAU=contribution)

if __name__ == '__main__':
    df = pd.DataFrame([scenario(k,v) for k,v in SCENARIOS.items()])
    print(df.to_string(index=False))
    base = df[df.Cenario=='Base'].iloc[0]
    print('\nBase break-even @ R$75k fixed:', math.ceil(75000/base.Contribuicao_por_MAU), 'MAU')
