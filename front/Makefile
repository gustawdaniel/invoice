include .env
export

node_modules: package.json
	pnpm i

up:	node_modules
	pnpm dev

t: node_modules
	pnpm test

json-server:
	npm run json-server