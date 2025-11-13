# Build stage
FROM rust:latest  as builder
WORKDIR /app

# Install SQL client libs
RUN apt-get update && apt-get install -y libpq-dev pkg-config

# Copy project
COPY . .

# Build release
RUN cargo build --release

# Runtime image
FROM debian:stable-slim
WORKDIR /app

RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /app/backend

EXPOSE 3000
CMD ["./backend"]
