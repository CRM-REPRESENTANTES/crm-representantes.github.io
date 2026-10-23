#!/usr/bin/env python3
"""Cifra um arquivo (tabela de preços, PDF, Excel) com a mesma chave da carteira.

Uso:
    CARTEIRA_SENHA='...' python3 tools/cifrar_arquivo.py <arquivo> [saida]

- A chave vem da senha de entrada do CRM por PBKDF2-SHA256, com o mesmo sal e
  número de iterações de carteira.enc.json. Assim, quem entrou no CRM abre o
  arquivo sem digitar a senha de novo.
- A saída tem os 12 bytes do IV seguidos do conteúdo cifrado em AES-256-GCM.
  Por padrão é gravada como <arquivo>.enc ao lado do original.
- Depois de cifrar, apague o original: ele não pode ir para o repositório.
- Se a senha for trocada (carteira.enc.json gerado de novo), cifre os arquivos
  outra vez a partir dos originais.
Requer: cryptography.
"""
import sys, os, json, base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    dest = sys.argv[2] if len(sys.argv) > 2 else src + '.enc'
    senha = os.environ.get('CARTEIRA_SENHA', '')
    if not senha:
        sys.exit('ERRO: defina a variavel de ambiente CARTEIRA_SENHA')
    enc = json.load(open(os.path.join(RAIZ, 'carteira.enc.json'), encoding='utf-8'))
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=base64.b64decode(enc['salt']),
                     iterations=enc['iter']).derive(senha.encode('utf-8'))
    try:  # confere a senha antes de cifrar
        AESGCM(key).decrypt(base64.b64decode(enc['iv']), base64.b64decode(enc['ct']), None)
    except Exception:
        sys.exit('ERRO: a senha nao abre carteira.enc.json')
    iv = os.urandom(12)
    data = open(src, 'rb').read()
    open(dest, 'wb').write(iv + AESGCM(key).encrypt(iv, data, None))
    print('cifrado', src, '->', dest, f'({len(data)} bytes)')


if __name__ == '__main__':
    main()
