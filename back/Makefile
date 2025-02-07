SSH_IP:=`cat hosts| cut -f 1 -d " "`

node_modules: package.json
	pnpm i

up: node_modules
	pnpm dev

generate:
	pnpm dlx prisma generate