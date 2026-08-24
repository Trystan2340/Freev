FROM docker.io/stirlingtools/stirling-pdf:2.14.3-ultra-lite

# Stirling PDF charge les fichiers de /customFiles en priorité sur ceux de
# l'application. On récupère l'index de cette version pendant la construction
# pour garder les noms de ressources générés par Stirling PDF.
USER root
COPY freev-return.js /tmp/freev-return.js
RUN set -eux; \
    mkdir -p /customFiles/static /tmp/stirling-index; \
    cd /tmp/stirling-index; \
    jar xf /app.jar BOOT-INF/classes/static/index.html; \
    mv BOOT-INF/classes/static/index.html /customFiles/static/index.html; \
    sed -i 's#</head>#<script defer src="/freev-return.js"></script></head>#' /customFiles/static/index.html; \
    mv /tmp/freev-return.js /customFiles/static/freev-return.js; \
    rm -rf /tmp/stirling-index; \
    chown -R stirlingpdfuser:stirlingpdfgroup /customFiles
USER stirlingpdfuser
