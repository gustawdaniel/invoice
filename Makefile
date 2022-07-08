include .env
export

node_modules: package.json
	npm i

up:	node_modules
	npm run dev

t: node_modules
	npm run test

json-server:
	json-server --watch db.json --port 4000