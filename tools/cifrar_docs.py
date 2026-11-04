#!/usr/bin/env python3
"""Cifra documentos (fichas técnicas, apostila, tabelas) com a SENHA DE DOCUMENTOS.

Uso:
    DOCS_SENHA='...' python3 tools/cifrar_docs.py <arquivo> [saida]
    DOCS_SENHA='...' python3 tools/cifrar_docs.py --nova      # cria arquivos/docs.enc.json (troca de senha)

- A chave vem da senha por PBKDF2-SHA256 com o sal e as iterações de arquivos/docs.enc.json.
- A saída tem 12 bytes de IV seguidos do conteúdo cifrado em AES-256-GCM (padrão: <arquivo>.enc).
- Depois de cifrar, apague o original: ele não pode ir para o repositório.
- Ao trocar a senha (--nova), cifre de novo todos os documentos a partir dos originais.
Requer: cryptography.
"""
import sys, os, json, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAB = os.path.join(RAIZ, 'arquivos', 'docs.enc.json')
ITER = 600000
TESTE = b'CRM-DOCS-OK'


def chave(senha, salt, it):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=it).derive(senha.encode('utf-8'))


def main():
    senha = os.environ.get('DOCS_SENHA', '')
    if not senha:
        sys.exit('ERRO: defina a variavel de ambiente DOCS_SENHA')
    if len(sys.argv) > 1 and sys.argv[1] == '--nova':
        salt, iv = os.urandom(16), os.urandom(12)
        k = chave(senha, salt, ITER)
        json.dump({'salt': base64.b64encode(salt).decode(), 'iter': ITER, 'iv': base64.b64encode(iv).decode(),
                   'ct': base64.b64encode(AESGCM(k).encrypt(iv, TESTE, None)).decode()}, open(CAB, 'w'))
        print('gravado', CAB)
        return
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cab = json.load(open(CAB))
    k = chave(senha, base64.b64decode(cab['salt']), cab['iter'])
    try:
        AESGCM(k).decrypt(base64.b64decode(cab['iv']), base64.b64decode(cab['ct']), None)
    except Exception:
        sys.exit('ERRO: a senha nao confere com arquivos/docs.enc.json')
    for src in sys.argv[1:2]:
        dest = sys.argv[2] if len(sys.argv) > 2 else src + '.enc'
        iv = os.urandom(12)
        data = open(src, 'rb').read()
        open(dest, 'wb').write(iv + AESGCM(k).encrypt(iv, data, None))
        print('cifrado', src, '->', dest, f'({len(data)} bytes)')


if __name__ == '__main__':
    main()
