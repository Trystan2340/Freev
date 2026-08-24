FROM docker.io/stirlingtools/stirling-pdf:2.14.3-ultra-lite AS stirling

# L'image Ultra-Lite est volontairement un runtime Java sans l'outil `jar`.
# Cette étape éphémère sert uniquement à extraire l'index correspondant à la
# même version de Stirling PDF ; elle n'est pas présente dans l'image finale.
FROM eclipse-temurin:21-jdk-jammy AS index-extractor
COPY --from=stirling /app.jar /app.jar
RUN set -eux; \
    mkdir -p /tmp/stirling-index; \
    cd /tmp/stirling-index; \
    jar xf /app.jar BOOT-INF/classes/static/index.html

FROM stirling

# Stirling PDF charge les fichiers de /customFiles en priorité sur ceux de
# l'application. On récupère l'index de cette version pendant la construction
# pour garder les noms de ressources générés par Stirling PDF.
USER root
COPY freev-return.js /tmp/freev-return.js
COPY --from=index-extractor /tmp/stirling-index/BOOT-INF/classes/static/index.html /tmp/freev-index.html
RUN set -eux; \
    mkdir -p /customFiles/static; \
    mv /tmp/freev-index.html /customFiles/static/index.html; \
    sed -i 's#</head>#<script defer src="/freev-return.js"></script></head>#' /customFiles/static/index.html; \
    mv /tmp/freev-return.js /customFiles/static/freev-return.js; \
    chown -R stirlingpdfuser:stirlingpdfgroup /customFiles
