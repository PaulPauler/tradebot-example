FROM node:8
WORKDIR /app
COPY package*.json ./

ADD dist ./dist
ADD public ./public
ADD views ./views

RUN npm install --only=production

EXPOSE 80
EXPOSE 443

CMD [ "npm", "start" ]