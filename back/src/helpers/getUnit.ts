import {Unit} from "@prisma/client";

export function getUnit(unit: string): Unit {
    switch (unit) {
        case 'piece': return Unit.piece;
        case 'hour': return Unit.hour;
        case 'pack.': return Unit.pack;
        case 'box': return Unit.box;
        case 'palette': return Unit.palette;
        case 't.': return Unit.t;
        case 'kg': return Unit.kg;
        case 'm2': return Unit.m2;
        case 'm3': return Unit.m3;
        case 'km': return Unit.km;
        case 'mb': return Unit.mb;
        case 'l': return Unit.l;
        case 'mh.': return Unit.mh;
        default: throw new Error(`Unit ${unit} not found`);
    }
}