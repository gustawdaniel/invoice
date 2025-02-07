import {Minimongo} from "~/helpers/db";
import {expect, it} from "@jest/globals";

it('ok', async () => {
    const db = await Minimongo('invoice')

    db.addCollection('ok')

    const doc1 = {species: "dog", name: "Mange"};
    const doc2 = {species: "dog", name: "Bingo"};

    await db.ok.upsert(doc1)
    await db.ok.upsert(doc2)

    const res1 = await db.ok.findOne({name: "Bingo"});
    expect(res1).toBeTruthy();
    expect(res1).toHaveProperty('species');

    const res2 = await db.ok.findOne({name: "NotFound"});
    expect(res2).toBeNull();

    await db.ok.remove({name: "Bingo"});

    const allResults = await db.ok.find({}).fetch();

    expect(allResults).toHaveLength(1);

    db.removeCollection('ok');
})
