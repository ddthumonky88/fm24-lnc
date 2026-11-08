FROM maven:3.9.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml ./
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/fm24-lnc-be-1.0.0.jar app.jar
COPY data ./data
ENV LNC_FILES_DIR=/app/data
EXPOSE 3001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
