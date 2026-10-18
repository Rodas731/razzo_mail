# Build stage
FROM rust:1-alpine as builder
WORKDIR /app
RUN apk add --no-cache musl-dev
COPY Cargo.toml ./
COPY src ./src
RUN cargo build --release

# Runtime stage
FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/target/release/razzo_mail /app/razzo_mail
COPY public ./public

ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["/app/razzo_mail"]
