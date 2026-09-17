# CareerLens AI - C++ GCC13 Sandbox Runner
# Security: minimal base, non-root user (1000:1000), no network access at runtime
FROM gcc:13

RUN groupadd -g 1000 sandbox && \
    useradd -u 1000 -g sandbox -m -s /bin/sh sandbox && \
    mkdir -p /sandbox/work && \
    chown -R sandbox:sandbox /sandbox

WORKDIR /sandbox
USER 1000:1000

CMD ["/bin/sh"]
