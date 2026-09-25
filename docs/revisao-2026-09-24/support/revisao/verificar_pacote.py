#!/usr/bin/env python3
"""Verifica preservacao dos originais, inventario e links da documentacao nova.
Nao testa o jogo. Executar a partir de qualquer diretorio com Python 3.
"""
from pathlib import Path
import hashlib
import json
import re
from collections import Counter
from urllib.parse import unquote, urlsplit

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent


def main():
    erros=[]
    inv=json.loads((HERE/'inventario_originais.json').read_text())
    for item in inv:
        p=ROOT/'historico/original_recebido'/item['nome']
        if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:
            erros.append('Original ausente/alterado: '+item['nome'])
        if not (ROOT/item['destino']).exists():
            erros.append('Destino ausente: '+item['destino'])
    esperado=(HERE/'sha256_zip_original.txt').read_text().split()[0]
    if hashlib.sha256((ROOT/'historico/pokearena-plano-original.zip').read_bytes()).hexdigest()!=esperado:
        erros.append('ZIP original alterado')
    registros=json.loads((HERE/'registros_legados.json').read_text())
    if len(set(r['registro'] for r in registros))!=len(registros):
        erros.append('Identificador de ocorrencia duplicado')
    for nome,prefix,nivel in [('LACUNAS.md','L',3),('DEFEITOS.md','D',2)]:
        texto=(ROOT/'historico/original_recebido'/nome).read_text()
        encontrados=list(re.finditer(r'^'+('#'*nivel)+r'\s+('+prefix+r'-\d+)([^\n]*)',texto,re.M))
        fichas=[r for r in registros if r['arquivo_original']==nome]
        if len(encontrados)!=len(fichas): erros.append('Contagem inconsistente: '+nome)
        for ficha in fichas:
            linha=texto.splitlines()[ficha['linha_original']-1]
            if ficha['titulo_historico']!=linha.lstrip('# ').strip():
                erros.append('Linha/titulo divergente: '+ficha['registro'])
    links=0
    docs=[p for p in ROOT.rglob('*.md') if 'historico' not in p.relative_to(ROOT).parts]
    for doc in docs:
        texto=re.sub(r'```.*?```','',doc.read_text(),flags=re.S)
        for alvo in re.findall(r'\[[^\]]*\]\(([^)]+)\)',texto):
            parts=urlsplit(alvo)
            if parts.scheme or alvo.startswith('#'): continue
            caminho=(doc.parent/unquote(parts.path)).resolve()
            links+=1
            if not caminho.exists(): erros.append(f'Link ausente em {doc.relative_to(ROOT)}: {alvo}')
    tipos={p: {'ocorrencias':sum(r['id_historico'].startswith(p+'-') for r in registros),
               'ids_distintos':len(set(r['id_historico'] for r in registros if r['id_historico'].startswith(p+'-')))} for p in ('L','D')}
    resultado={'escopo':'Integridade documental, nao teste de software do jogo.', 'status':'OK' if not erros else 'FALHOU',
      'originais_conferidos':len(inv),'bytes_originais':sum(x['bytes'] for x in inv),
      'zip_original_preservado':not any('ZIP original' in e for e in erros),
      'documentos_novos_ou_redirecionados':len(docs),'links_locais_conferidos':links,
      'registros':tipos,'erros':erros}
    (HERE/'verificacao_pacote.json').write_text(json.dumps(resultado,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(resultado,ensure_ascii=False))
    if erros: raise SystemExit(1)


if __name__=='__main__': main()
