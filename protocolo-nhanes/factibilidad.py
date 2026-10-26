"""Verificación de factibilidad: STOP-BAG adaptado y PHQ-9, NHANES 2017–marzo 2020."""
import sys
import numpy as np
import pandas as pd
from scipy import stats

DATA = sys.argv[1]
OUT = sys.argv[2]


def leer(nombre):
    x = pd.read_sas(f"{DATA}/{nombre}.xpt", format="xport")
    num = x.select_dtypes("number").columns
    x[num] = x[num].round(6)  # el formato xport guarda el 0 como 5.4e-79
    return x


import warnings
warnings.simplefilter("ignore", pd.errors.PerformanceWarning)
df = leer("P_DEMO")
for f in ["P_SLQ", "P_DPQ", "P_BPQ", "P_BMX", "P_DIQ", "P_MCQ", "P_SMQ", "P_HIQ"]:
    df = df.merge(leer(f), on="SEQN", how="left")


def nan_codes(s, codes=(7, 9)):
    return s.where(~s.isin(codes))


# Exposición: STOP-BAG (0 a 7)
for v in ["SLQ030", "SLQ040", "SLQ120", "BPQ020"]:
    df[v] = nan_codes(df[v])
ind = lambda cond, base: np.where(base.isna(), np.nan, cond.astype(float))
df["sb_s"] = ind(df.SLQ030.isin([2, 3]), df.SLQ030)
df["sb_t"] = ind(df.SLQ120.isin([3, 4]), df.SLQ120)
df["sb_o"] = ind(df.SLQ040.isin([2, 3]), df.SLQ040)
df["sb_p"] = ind(df.BPQ020 == 1, df.BPQ020)
df["sb_b"] = ind(df.BMXBMI > 35, df.BMXBMI)
df["sb_a"] = (df.RIDAGEYR > 50).astype(float)
df["sb_g"] = (df.RIAGENDR == 1).astype(float)
items = ["sb_s", "sb_t", "sb_o", "sb_p", "sb_b", "sb_a", "sb_g"]
df["sb_puntaje"] = df[items].sum(axis=1, min_count=7)
df.loc[df[items].isna().any(axis=1), "sb_puntaje"] = np.nan
df["sb_alto"] = np.where(df.sb_puntaje.isna(), np.nan, (df.sb_puntaje >= 3).astype(float))

# Desenlace: PHQ-9 >= 10
dpq = [f"DPQ0{i}0" for i in range(1, 10)]
for v in dpq:
    df[v] = nan_codes(df[v])
df["phq9"] = df[dpq].sum(axis=1, min_count=9)
df["dep"] = np.where(df.phq9.isna(), np.nan, (df.phq9 >= 10).astype(float))

# Covariables
df["DMDEDUC2"] = nan_codes(df.DMDEDUC2)
df["DMDMARTZ"] = nan_codes(df.DMDMARTZ, (77, 99))
df["DIQ010"] = nan_codes(df.DIQ010)
df["HIQ011"] = nan_codes(df.HIQ011)
df["SMQ020"] = nan_codes(df.SMQ020)
df["SMQ040"] = nan_codes(df.SMQ040)
mcq = ["MCQ160B", "MCQ160C", "MCQ160D", "MCQ160E", "MCQ160F"]
for v in mcq:
    df[v] = nan_codes(df[v])
df["ecv"] = np.where((df[mcq] == 1).any(axis=1), 1.0,
                     np.where((df[mcq] == 2).all(axis=1), 0.0, np.nan))
df["tabaco"] = np.select(
    [df.SMQ020 == 2, (df.SMQ020 == 1) & (df.SMQ040 == 3), (df.SMQ020 == 1) & df.SMQ040.isin([1, 2])],
    [0, 1, 2], default=-1).astype(float)
df.loc[df.tabaco == -1, "tabaco"] = np.nan

# Flujo
pasos = []
m = pd.Series(True, index=df.index)
pasos.append(("Participantes del archivo P_DEMO", int(m.sum())))
m &= df.RIDAGEYR >= 20
pasos.append(("De 20 años o más", int(m.sum())))
m &= df.RIDSTATR == 2
pasos.append(("Examinados en el MEC", int(m.sum())))
m &= df.RIDEXPRG != 1
pasos.append(("Sin embarazo al momento del examen", int(m.sum())))
m &= df.sb_puntaje.notna()
pasos.append(("Con puntaje STOP-BAG válido", int(m.sum())))
m &= df.dep.notna()
pasos.append(("Con PHQ-9 completo (población analítica)", int(m.sum())))
df["elegible"] = m
covs = ["DMDEDUC2", "DMDMARTZ", "RIDRETH3", "tabaco", "DIQ010", "ecv", "HIQ011"]  # PIR faltante = categoría propia
cc = m & df[covs].notna().all(axis=1)
pasos.append(("Con covariables completas (análisis de casos completos)", int(cc.sum())))
df["completo"] = cc

# Pérdidas por variable dentro de la población analítica
perdidas = {v: int((m & df[v].isna()).sum()) for v in covs}

# Diseño muestral: linealización de Taylor para razones dentro de una subpoblación
w = df.WTMECPRP.fillna(0).to_numpy()
strata = df.SDMVSTRA.to_numpy()
psu = df.SDMVPSU.to_numpy()
n_strata = len(np.unique(strata))
n_psu = len(pd.DataFrame({'h': strata, 'j': psu}).drop_duplicates())
gl = n_psu - n_strata


def var_lin(z):
    t = pd.DataFrame({"h": strata, "j": psu, "z": z}).groupby(["h", "j"]).z.sum().reset_index()
    v = 0.0
    for _, g in t.groupby("h"):
        nh = len(g)
        if nh > 1:
            v += nh / (nh - 1) * ((g.z - g.z.mean()) ** 2).sum()
    return v


def prop(y, sub):
    d = (sub & ~np.isnan(y)).astype(float)
    yy = np.nan_to_num(y)
    W = (w * d).sum()
    p = (w * d * yy).sum() / W
    z = w * d * (yy - p) / W
    se = np.sqrt(var_lin(z))
    # IC logit, como `proportion` de Stata
    t = stats.t.ppf(0.975, gl)
    lg, se_lg = np.log(p / (1 - p)), se / (p * (1 - p))
    lo, hi = [1 / (1 + np.exp(-(lg + s * t * se_lg))) for s in (-1, 1)]
    n = int(d.sum())
    deff = se ** 2 / (p * (1 - p) / n)
    return p, lo, hi, deff, z, W


def rp(y, x, sub):
    p1, *_, z1, _ = prop(y, sub & (x == 1))
    p0, *_, z0, _ = prop(y, sub & (x == 0))
    se = np.sqrt(var_lin(z1 / p1 - z0 / p0))
    t = stats.t.ppf(0.975, gl)
    r = p1 / p0
    return r, r * np.exp(-t * se), r * np.exp(t * se)


sub = df.elegible.to_numpy()
y, x = df.dep.to_numpy(), df.sb_alto.to_numpy()
res = {}
res["prev_alto"] = prop(x, sub)[:4]
res["prev_dep"] = prop(y, sub)[:4]
res["dep_alto"] = prop(y, sub & (x == 1))[:4]
res["dep_bajo"] = prop(y, sub & (x == 0))[:4]
res["rp_cruda"] = rp(y, x, sub)

# Gradiente no ponderado y ponderado
cat = pd.cut(df.sb_puntaje, [-1, 2, 4, 7], labels=["0–2", "3–4", "5–7"])
grad = []
for c in ["0–2", "3–4", "5–7"]:
    s = sub & (cat == c).to_numpy()
    grad.append((c, int(s.sum()), int((s & (y == 1)).sum()), prop(y, s)[0]))

# Tabla no ponderada como en el protocolo de referencia
el = df[df.elegible]
tab = el.groupby("sb_alto").dep.agg(["count", "sum"])

# Potencia exploratoria (comparación de dos proporciones, no ponderada)
n1, n0 = int(tab.loc[1.0, "count"]), int(tab.loc[0.0, "count"])
q1, q0 = tab.loc[1.0, "sum"] / n1, tab.loc[0.0, "sum"] / n0


def potencia(n1, n0, p1, p0):
    pb = (n1 * p1 + n0 * p0) / (n1 + n0)
    se0 = np.sqrt(pb * (1 - pb) * (1 / n1 + 1 / n0))
    se1 = np.sqrt(p1 * (1 - p1) / n1 + p0 * (1 - p0) / n0)
    return stats.norm.cdf((abs(p1 - p0) - 1.96 * se0) / se1)


pot = potencia(n1, n0, q1, q0)
pot_deff = potencia(n1 / 2, n0 / 2, q1, q0)
eventos_cc = int((cc & (df.dep == 1)).sum())
parametros = 21

with open(OUT, "w") as f:
    f.write(f"Estratos={n_strata} UPM={n_psu} gl={gl}\n\nFLUJO\n")
    for a, b in pasos:
        f.write(f"{a}\t{b}\n")
    f.write(f"\nNo sabe/rechazado SLQ030={int(((df.RIDAGEYR>=20)&df.SLQ030.isna()&df.SEQN.isin(df[df.RIDSTATR==2].SEQN)).sum())}\n")
    f.write(f"\nPERDIDAS COVARIABLES (en poblacion analitica)\n{perdidas}\nPIR faltante={int((m & df.INDFMPIR.isna()).sum())}\n")
    f.write("\nPREVALENCIAS PONDERADAS (p, IC95 lo, hi, deff)\n")
    for k, v in res.items():
        f.write(f"{k}\t" + "\t".join(f"{z:.4f}" for z in v) + "\n")
    f.write("\nNO PONDERADO por sb_alto (n, casos)\n" + tab.to_string() + "\n")
    f.write(f"\nGRADIENTE (cat, n, casos, prev ponderada)\n")
    for g in grad:
        f.write("\t".join(str(round(z, 4)) if isinstance(z, float) else str(z) for z in g) + "\n")
    f.write(f"\nPotencia={pot:.4f} PotenciaDEFF2={pot_deff:.4f}\n")
    f.write(f"Eventos casos completos={eventos_cc} parametros={parametros} EPV={eventos_cc/parametros:.1f}\n")
    f.write(f"Items positivos (%, no ponderado, poblacion analitica): " +
            ", ".join(f"{i}={el[i].mean()*100:.1f}" for i in items) + "\n")
print(open(OUT).read())

# Base de datos para la tesis: todos los participantes (para subpop) con las variables construidas
cols = ["SEQN", "SDMVPSU", "SDMVSTRA", "WTMECPRP", "elegible", "completo", "RIDAGEYR", "RIAGENDR",
        "RIDRETH3", "DMDEDUC2", "DMDMARTZ", "INDFMPIR", "RIDSTATR", "RIDEXPRG", "SLQ030", "SLQ040",
        "SLQ120", "BPQ020", "BMXBMI", *items, "sb_puntaje", "sb_alto", *dpq, "phq9", "dep",
        "DIQ010", *mcq, "ecv", "SMQ020", "SMQ040", "tabaco", "HIQ011"]
base = df[cols].copy()
base.columns = [c.lower() for c in base.columns]
base[["elegible", "completo"]] = base[["elegible", "completo"]].astype(int)
base.to_csv(f"{OUT.rsplit('/', 1)[0]}/nhanes_aos_depresion.csv", index=False)
base.to_stata(f"{OUT.rsplit('/', 1)[0]}/nhanes_aos_depresion.dta", write_index=False, version=118)
print("base", base.shape, "elegibles", base.elegible.sum(), "dep", base[base.elegible == 1].dep.sum(),
      "alto", base[base.elegible == 1].sb_alto.sum())
