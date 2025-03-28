FROM node:18-alpine

WORKDIR /app

COPY ../UI/package*.json ./
RUN npm install

COPY ../UI . 
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
