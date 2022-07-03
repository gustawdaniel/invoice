node_modules: package.json
	npm i

up:	node_modules
	npm run dev

t: node_modules
	npm run test