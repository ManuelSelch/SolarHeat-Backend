mkdir backup

# start database
docker compose up -d

# start backend
npm i
npm install -g pm2
npm run deploy
