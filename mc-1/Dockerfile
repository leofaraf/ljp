# syntax=docker/dockerfile:1

FROM golang:1.21-alpine AS builder
WORKDIR /app

# Enable module download caching
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o mc1 .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/mc1 /usr/local/bin/mc1

# Provide default envs (override in runtime)
ENV PORT=8080
EXPOSE 8080

CMD ["/usr/local/bin/mc1"]
