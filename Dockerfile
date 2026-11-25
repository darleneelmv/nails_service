# Sirve para cualquier host con Docker (Hugging Face Spaces, Railway, Fly, VPS…)
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm run build
ENV NODE_ENV=production \
    PORT=7860 \
    DATA_DIR=/tmp/brillo-data
EXPOSE 7860
CMD ["npm", "start"]
