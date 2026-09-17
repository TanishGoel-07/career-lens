# CareerLens AI - OpenJDK 21 Sandbox Runner
# Security: minimal base, non-root user (1000:1000), no network access at runtime
FROM openjdk:21-slim

RUN groupadd -g 1000 sandbox && \
    useradd -u 1000 -g sandbox -m -s /bin/sh sandbox && \
    mkdir -p /sandbox/work && \
    chown -R sandbox:sandbox /sandbox

WORKDIR /sandbox
USER 1000:1000

CMD ["java"]
