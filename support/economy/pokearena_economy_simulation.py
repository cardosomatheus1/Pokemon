import math
from math import comb
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

SEED = 20260818


def breakeven_winrate(rake_on_pot: float) -> float:
    return 1.0 / (2.0 * (1.0 - rake_on_pot))


def ruin_sim(start, stake=50, rake=0.10, p=0.5, n_matches=20, n_paths=300_000, seed=SEED):
    rng = np.random.default_rng(seed + int(start*10) + int(p*1000) + int(rake*10000))
    bal = np.full(n_paths, float(start))
    for _ in range(n_matches):
        can = bal >= stake
        idx = np.where(can)[0]
        if len(idx) == 0:
            break
        wins = rng.random(len(idx)) < p
        # Winner receives 2*stake*(1-rake), after having paid stake.
        bal[idx[wins]] += stake * (1 - 2*rake)
        bal[idx[~wins]] -= stake
    return {
        'starting_stakes': start / stake,
        'start_pc': start,
        'rake': rake,
        'win_rate': p,
        'matches': n_matches,
        'ruin_prob': float((bal < stake).mean()),
        'mean_end': float(bal.mean()),
        'median_end': float(np.median(bal)),
        'p10_end': float(np.percentile(bal, 10)),
        'p90_end': float(np.percentile(bal, 90)),
    }


def expected_hurdle_conversion(p, matches=80, stake=50, rake=.10, ratio=5, hurdle_rate=.025):
    win_net = stake * (1 - 2*rake)
    loss_net = -stake
    total_stake = matches * stake
    hurdle = hurdle_rate * total_stake
    expected_pc_t = 0.0
    qualify_prob = 0.0
    for w in range(matches + 1):
        pr = comb(matches, w) * (p**w) * ((1-p)**(matches-w))
        pnl = w*win_net + (matches-w)*loss_net
        eligible = max(0.0, pnl - hurdle)
        expected_pc_t += pr * eligible / ratio
        if eligible > 0:
            qualify_prob += pr
    return expected_pc_t, qualify_prob


def expected_naive_conversion(p, matches=80, stake=50, rake=.10, ratio=5):
    # Current v1.1 style: each win can create the opponent's post-rake bonus contribution as PC-C.
    # For equal stakes, that is stake*(1-rake) PC-C per win.
    return matches * p * stake * (1-rake) / ratio


N = 10_000
profiles_arr = np.array(['casual']*5500 + ['core']*3500 + ['hardcore']*1000)
_rng_profiles = np.random.default_rng(SEED)
_rng_profiles.shuffle(profiles_arr)
PARAMS = {
    'casual': {'arena_bets':8, 'arena_stake':10, 'league_matches':2, 'league_stake':50},
    'core': {'arena_bets':20, 'arena_stake':15, 'league_matches':6, 'league_stake':50},
    'hardcore': {'arena_bets':30, 'arena_stake':20, 'league_matches':10, 'league_stake':50},
}


def macro_bonus_sim(weeks=52, weekly_grant=80, ceiling=None, start=200, seed=SEED):
    rng = np.random.default_rng(seed + (0 if ceiling is None else int(ceiling)))
    bal = np.full(N, float(start))
    total_grants = 0.0
    total_arena_sink = 0.0
    total_league_rake = 0.0
    weekly = []
    for w in range(weeks):
        if ceiling is None:
            grant = np.full(N, float(weekly_grant))
        else:
            # Soft issuance ceiling: winnings may exceed ceiling; new free grants only top up toward it.
            grant = np.minimum(float(weekly_grant), np.maximum(0.0, ceiling - bal))
        bal += grant
        total_grants += grant.sum()

        # Arena approximation: user chooses a fighter with 15% true win probability.
        # Offered payout is fair payout reduced by the configured 8% edge.
        p_true = 0.15
        total_mult = 0.92 / p_true
        for prof, cfg in PARAMS.items():
            idx = np.where(profiles_arr == prof)[0]
            stake = cfg['arena_stake']
            for _ in range(cfg['arena_bets']):
                can = idx[bal[idx] >= stake]
                if len(can) == 0:
                    continue
                before = bal[can].sum()
                wins = rng.random(len(can)) < p_true
                bal[can[wins]] += stake * (total_mult - 1)
                bal[can[~wins]] -= stake
                total_arena_sink += before - bal[can].sum()

        # League: matched within activity profile, fair 50/50 pairing; aggregate skill transfers cancel.
        for prof, cfg in PARAMS.items():
            idx = np.where(profiles_arr == prof)[0]
            stake = cfg['league_stake']
            for _ in range(cfg['league_matches']):
                elig = idx[bal[idx] >= stake].copy()
                rng.shuffle(elig)
                if len(elig) % 2:
                    elig = elig[:-1]
                if len(elig) == 0:
                    continue
                a, b = elig[0::2], elig[1::2]
                bal[a] -= stake
                bal[b] -= stake
                awin = rng.random(len(a)) < 0.5
                winners = np.where(awin, a, b)
                payout = 2 * stake * (1 - 0.10)
                bal[winners] += payout
                total_league_rake += len(a) * (2*stake*0.10)

        weekly.append({
            'week': w+1,
            'money_supply': bal.sum(),
            'grants_cumulative': total_grants,
            'arena_sink_cumulative': total_arena_sink,
            'league_rake_cumulative': total_league_rake,
            'median_balance': float(np.median(bal)),
            'p10_balance': float(np.percentile(bal, 10)),
            'p90_balance': float(np.percentile(bal, 90)),
            'pct_below_bronze_stake': float((bal < 50).mean()),
        })
    return pd.DataFrame(weekly)


# 1) Rake math
rake_rows = []
for r in [0.04, 0.05, 0.075, 0.08, 0.10, 0.125, 0.15]:
    rake_rows.append({
        'rake_on_pot': r,
        'breakeven_win_rate': breakeven_winrate(r),
        'currency_half_life_stake_cycles': math.log(0.5) / math.log(1-r),
    })
rake_df = pd.DataFrame(rake_rows)
rake_df.to_csv('/mnt/data/pokearena_rake_sensitivity.csv', index=False)

# 2) Bankroll ruin
ruin_rows = []
for starting_stakes in range(2, 13):
    for p in [0.50, 0.55, 0.58, 0.60]:
        ruin_rows.append(ruin_sim(starting_stakes*50, p=p))
ruin_df = pd.DataFrame(ruin_rows)
ruin_df.to_csv('/mnt/data/pokearena_bankroll_ruin.csv', index=False)

# 3) Bonus supply macro
bonus_runs = {}
for ceiling in [None, 300, 400, 500, 600, 800]:
    key = 'none' if ceiling is None else str(ceiling)
    bonus_runs[key] = macro_bonus_sim(ceiling=ceiling)
    bonus_runs[key].to_csv(f'/mnt/data/pokearena_bonus_supply_ceiling_{key}.csv', index=False)

summary_rows = []
for key, df in bonus_runs.items():
    row = df.iloc[-1]
    summary_rows.append({
        'bonus_ceiling': key,
        'final_money_supply': row.money_supply,
        'supply_per_player': row.money_supply / N,
        'median_balance': row.median_balance,
        'p10_balance': row.p10_balance,
        'p90_balance': row.p90_balance,
        'pct_below_bronze_stake': row.pct_below_bronze_stake,
        'actual_grants': row.grants_cumulative,
        'nominal_grants': 80*52*N,
        'grant_emission_rate': row.grants_cumulative/(80*52*N),
        'arena_sink': row.arena_sink_cumulative,
        'league_rake': row.league_rake_cumulative,
    })
bonus_summary_df = pd.DataFrame(summary_rows)
bonus_summary_df.to_csv('/mnt/data/pokearena_bonus_supply_summary.csv', index=False)

# 4) Competitive conversion sensitivity
segments = [
    ('average', 0.70, 0.50),
    ('above_average', 0.15, 0.53),
    ('good', 0.10, 0.56),
    ('elite', 0.04, 0.58),
    ('top', 0.01, 0.60),
]
conv_rows = []
for name, share, p in segments:
    naive = expected_naive_conversion(p, ratio=5)
    pos, pos_prob = expected_hurdle_conversion(p, hurdle_rate=0.0, ratio=5)
    h25, h25_prob = expected_hurdle_conversion(p, hurdle_rate=0.025, ratio=5)
    h50, h50_prob = expected_hurdle_conversion(p, hurdle_rate=0.05, ratio=5)
    conv_rows.append({
        'segment': name,
        'population_share': share,
        'realized_win_rate_assumption': p,
        'naive_pc_t_per_season': naive,
        'positive_pnl_pc_t_per_season': pos,
        'hurdle_2_5_pc_t_per_season': h25,
        'hurdle_5_pc_t_per_season': h50,
        'prob_positive_pnl': pos_prob,
        'prob_hurdle_2_5': h25_prob,
        'prob_hurdle_5': h50_prob,
    })
conv_df = pd.DataFrame(conv_rows)
conv_df.to_csv('/mnt/data/pokearena_competitive_conversion.csv', index=False)

# Population totals for 10k league players
pop_totals = {}
for col in ['naive_pc_t_per_season','positive_pnl_pc_t_per_season','hurdle_2_5_pc_t_per_season','hurdle_5_pc_t_per_season']:
    pop_totals[col] = float((conv_df[col]*conv_df['population_share']).sum()*10_000)

# 400k matches * 100 PC pot * 10% rake = 4m PC rake for 10k players * 80 player-matches / 2.
pop_totals['gross_league_rake'] = 4_000_000.0
pd.DataFrame([pop_totals]).to_csv('/mnt/data/pokearena_competitive_conversion_population.csv', index=False)

# Charts (default Matplotlib styling, separate figures)
plt.figure(figsize=(8,5))
plt.plot(bonus_runs['none']['week'], bonus_runs['none']['money_supply']/1e6, label='Sem teto')
plt.plot(bonus_runs['500']['week'], bonus_runs['500']['money_supply']/1e6, label='Teto de emissão 500 PC-B')
plt.xlabel('Semana')
plt.ylabel('PC-B em circulação (milhões)')
plt.title('Simulação de oferta PC-B — 10 mil jogadores')
plt.legend()
plt.tight_layout()
plt.savefig('/mnt/data/pokearena_bonus_supply_52w.png', dpi=180)
plt.close()

plt.figure(figsize=(8,5))
subset = ruin_df[(ruin_df['win_rate']==0.50)]
plt.plot(subset['starting_stakes'], subset['ruin_prob']*100, marker='o')
plt.xlabel('Bankroll inicial (número de stakes Bronze)')
plt.ylabel('Probabilidade de ficar sem 1 stake após 20 partidas (%)')
plt.title('Risco de quebra — rake 10%, jogador 50% WR')
plt.tight_layout()
plt.savefig('/mnt/data/pokearena_bankroll_ruin.png', dpi=180)
plt.close()

plt.figure(figsize=(8,5))
labels=['Regra v1.1\npor vitória','Lucro líquido\n> 0','Lucro +\nhurdle 2,5%','Lucro +\nhurdle 5%']
values=[pop_totals['naive_pc_t_per_season'],pop_totals['positive_pnl_pc_t_per_season'],pop_totals['hurdle_2_5_pc_t_per_season'],pop_totals['hurdle_5_pc_t_per_season']]
plt.bar(labels, np.array(values)/1e3)
plt.ylabel('PC-T potencial por temporada (milhares)')
plt.title('Conversão potencial — 10 mil jogadores / 80 partidas')
plt.tight_layout()
plt.savefig('/mnt/data/pokearena_conversion_comparison.png', dpi=180)
plt.close()

print('Generated simulation artifacts.')
print(rake_df.to_string(index=False))
print('\nBonus supply summary:')
print(bonus_summary_df[['bonus_ceiling','final_money_supply','median_balance','pct_below_bronze_stake','grant_emission_rate']].to_string(index=False))
print('\nCompetitive population totals:')
print(pd.DataFrame([pop_totals]).to_string(index=False))
