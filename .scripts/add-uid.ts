const fs = require('fs');
const db = require('../db.json')
const {uid} = require("uid");

db.clients = db.clients.map(c => ({
    id: uid(),
    ...c
}))

fs.writeFileSync('db.json', JSON.stringify(db));