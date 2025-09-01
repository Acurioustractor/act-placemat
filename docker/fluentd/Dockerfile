# Fluentd Docker image for ACT Placemat log aggregation
# Australian-compliant log processing and forwarding

FROM fluent/fluentd:v1.16-debian

# Switch to root for package installation
USER root

# Install additional gems for enhanced functionality
RUN buildDeps="sudo make gcc g++ libc-dev" \
    && apt-get update \
    && apt-get install -y --no-install-recommends $buildDeps \
    && apt-get install -y --no-install-recommends \
       tzdata \
       curl \
       jq \
    && gem install \
       fluent-plugin-elasticsearch \
       fluent-plugin-record-modifier \
       fluent-plugin-prometheus \
       fluent-plugin-systemd \
       fluent-plugin-kubernetes_metadata_filter \
       fluent-plugin-multi-format-parser \
       fluent-plugin-json-in-json-2 \
       fluent-plugin-detect-exceptions \
       fluent-plugin-concat \
       fluent-plugin-parser-cri \
       fluent-plugin-rewrite-tag-filter \
    && SUDO_FORCE_REMOVE=yes \
       apt-get purge -y --auto-remove \
                     -o APT::AutoRemove::RecommendsImportant=false \
                     $buildDeps \
    && rm -rf /var/lib/apt/lists/* \
    && gem sources --clear-all \
    && rm -rf /tmp/* /var/tmp/* /usr/lib/ruby/gems/*/cache/*.gem

# Set Australian timezone
ENV TZ=Australia/Sydney
RUN ln -snf /usr/share/zoneinfo/Australia/Sydney /etc/localtime && \
    echo Australia/Sydney > /etc/timezone

# Create necessary directories
RUN mkdir -p /fluentd/log /fluentd/etc /fluentd/plugins /app/logs

# Copy configuration files
COPY conf/ /fluentd/etc/
COPY plugins/ /fluentd/plugins/

# Create Australian compliance plugin
RUN cat > /fluentd/plugins/out_australian_compliance.rb << 'EOF'
require 'fluent/plugin/output'

module Fluent::Plugin
  class AustralianComplianceOutput < Output
    Fluent::Plugin.register_output('australian_compliance', self)
    
    config_param :data_residency, :string, default: 'Australia'
    config_param :compliance_framework, :string, default: 'Australian-Privacy-Act'
    config_param :retention_policy, :string, default: '7-years'
    
    def configure(conf)
      super
      log.info "Australian Compliance Output configured: residency=#{@data_residency}, framework=#{@compliance_framework}"
    end
    
    def write(chunk)
      chunk.each do |time, record|
        # Add Australian compliance metadata
        record['data_residency'] = @data_residency
        record['compliance_framework'] = @compliance_framework
        record['retention_policy'] = @retention_policy
        record['processed_at'] = Time.at(time).strftime('%Y-%m-%d %H:%M:%S %Z')
        record['timezone'] = 'Australia/Sydney'
        record['country_code'] = 'AU'
        
        # Classify data based on content
        record['data_classification'] = classify_data(record)
        
        # Add privacy protection flags
        record['privacy_protected'] = true
        record['pii_detected'] = detect_pii(record)
        
        log.debug "Processed log with Australian compliance: #{record}"
      end
    end
    
    private
    
    def classify_data(record)
      # Simple classification logic
      if record['message']&.match?(/password|token|secret|key/i)
        'confidential'
      elsif record['message']&.match?(/email|phone|address|abn/i)
        'personal'
      else
        'internal'
      end
    end
    
    def detect_pii(record)
      pii_patterns = [
        /\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/,  # ABN
        /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/,  # Credit card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,  # Email
        /\b04\d{2}\s?\d{3}\s?\d{3}\b/,  # Australian mobile
      ]
      
      message = record['message'].to_s
      pii_patterns.any? { |pattern| message.match?(pattern) }
    end
  end
end
EOF

# Set permissions
RUN chown -R fluent:fluent /fluentd/log /fluentd/etc /fluentd/plugins /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:24220/api/plugins.json || exit 1

# Switch back to fluent user
USER fluent

# Expose ports
EXPOSE 24224 24220

# Set working directory
WORKDIR /fluentd

# Start Fluentd
CMD ["fluentd", "-c", "/fluentd/etc/fluent.conf", "-v"]

# Labels for Australian compliance
LABEL maintainer="ACT Placemat Community <logs@actplacemat.org.au>"
LABEL version="1.0.0"
LABEL description="Log Aggregation - Fluentd for ACT Placemat Intelligence Hub"
LABEL data.residency="Australia"
LABEL compliance.framework="Australian-Privacy-Act"
LABEL log.retention="7-years"