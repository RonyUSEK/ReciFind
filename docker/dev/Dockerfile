FROM node:18-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Install all development tools
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    nano \
    vim \
    htop \
    postgresql-client-15 \
    net-tools \
    iproute2 \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create user matching host user to avoid permission issues
ARG UID=1000
ARG GID=1000

# Modify existing node user to match host user
RUN usermod -u ${UID} node 2>/dev/null || true && \
    groupmod -g ${GID} node 2>/dev/null || true && \
    chown -R node:node /home/node

USER node

# Copy helper scripts
COPY --chown=node:node check-db.sh /usr/local/bin/check-db
RUN chmod +x /usr/local/bin/check-db

# Custom bash prompt for easy identification
RUN echo "PS1='\[\033[01;33m\][fullstack-dev] \[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '" >> /home/node/.bashrc

# Add helpful aliases for development
RUN echo "alias start-backend='cd /workspace/backend && npm run dev'" >> /home/node/.bashrc && \
    echo "alias start-frontend='cd /workspace/frontend && npm start'" >> /home/node/.bashrc && \
    echo "alias db-check='check-db'" >> /home/node/.bashrc && \
    echo "export DATABASE_URL='postgresql://user:pass@localhost:5432/mydb'" >> /home/node/.bashrc && \
    echo "echo ''" >> /home/node/.bashrc && \
    echo "echo '========================================'" >> /home/node/.bashrc && \
    echo "echo 'Fullstack Dev Environment Ready!'" >> /home/node/.bashrc && \
    echo "echo '========================================'" >> /home/node/.bashrc && \
    echo "echo 'Services:'" >> /home/node/.bashrc && \
    echo "echo '  - Frontend: http://localhost:3000'" >> /home/node/.bashrc && \
    echo "echo '  - Backend:  http://localhost:5000'" >> /home/node/.bashrc && \
    echo "echo '  - Database: localhost:5432'" >> /home/node/.bashrc && \
    echo "echo ''" >> /home/node/.bashrc && \
    echo "echo 'Quick Commands:'" >> /home/node/.bashrc && \
    echo "echo '  start-backend  - Run backend with hot reload'" >> /home/node/.bashrc && \
    echo "echo '  start-frontend - Run frontend dev server'" >> /home/node/.bashrc && \
    echo "echo '  db-check       - Verify database connection'" >> /home/node/.bashrc && \
    echo "echo '========================================'" >> /home/node/.bashrc && \
    echo "echo ''" >> /home/node/.bashrc

WORKDIR /workspace

CMD ["/bin/bash"]
