FROM pgvector/pgvector:pg16

# openssl: gera o certificado TLS autoassinado usado quando o Postgres sobe com `ssl=on`
# (serviço `postgres` em docker-compose.oci.yml). O acesso direto ao banco da Oracle a partir das
# máquinas de desenvolvimento (DATABASE_URL apontando para o IP público da instância) exige TLS no
# fio — sem isso senha e dado de cliente trafegariam em texto puro pela internet.
#
# A chave privada nasce e fica dentro da imagem construída na própria instância (`build:` no
# compose) — nunca é commitada nem sai do servidor. Clientes usam `sslmode=require` (cifra o canal
# sem verificar CA), já que o certificado é autoassinado.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends postgresql-16-postgis-3 openssl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/postgresql/tls \
    && openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
         -subj "/CN=atlasgr-postgres" \
         -keyout /etc/postgresql/tls/server.key \
         -out /etc/postgresql/tls/server.crt \
    && chown postgres:postgres /etc/postgresql/tls/server.key /etc/postgresql/tls/server.crt \
    && chmod 600 /etc/postgresql/tls/server.key
