# Fail2ban Docker image for ACT Placemat network security
# Australian-compliant intrusion prevention system

FROM alpine:3.19

# Install fail2ban and dependencies
RUN apk add --no-cache \
    fail2ban \
    iptables \
    python3 \
    py3-pip \
    curl \
    tzdata \
    logrotate \
    && rm -rf /var/cache/apk/*

# Set Australian timezone
ENV TZ=Australia/Sydney
RUN cp /usr/share/zoneinfo/Australia/Sydney /etc/localtime && \
    echo "Australia/Sydney" > /etc/timezone

# Create fail2ban directories
RUN mkdir -p /var/log/fail2ban \
    /var/lib/fail2ban \
    /var/run/fail2ban \
    /etc/fail2ban/action.d \
    /etc/fail2ban/filter.d \
    /etc/fail2ban/jail.d

# Copy custom configuration
COPY jail.local /etc/fail2ban/jail.local
COPY filters/ /etc/fail2ban/filter.d/
COPY actions/ /etc/fail2ban/action.d/

# Create startup script
RUN cat > /startup.sh << 'EOF'
#!/bin/sh

# Australian compliance logging
echo "$(date '+%Y-%m-%d %H:%M:%S %Z') - Starting ACT Placemat Fail2ban" >> /var/log/fail2ban/startup.log
echo "Data Residency: Australia" >> /var/log/fail2ban/startup.log
echo "Compliance Framework: Australian Privacy Act" >> /var/log/fail2ban/startup.log

# Start fail2ban
exec fail2ban-server -f -x -v start
EOF

RUN chmod +x /startup.sh

# Expose fail2ban communication socket
VOLUME ["/var/log", "/var/lib/fail2ban"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD fail2ban-client status || exit 1

# Run as fail2ban user for security
RUN addgroup -S fail2ban && adduser -S fail2ban -G fail2ban
USER fail2ban

CMD ["/startup.sh"]

# Labels for Australian compliance
LABEL maintainer="ACT Placemat Community <security@actplacemat.org.au>"
LABEL version="1.0.0"
LABEL description="Network Security - Fail2ban for ACT Placemat Intelligence Hub"
LABEL data.residency="Australia"
LABEL compliance.framework="Australian-Privacy-Act"
LABEL security.component="intrusion-prevention"