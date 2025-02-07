import {IndexedDb} from "minimongo";
import util from 'util';

export async function Minimongo(name: string) {
  return new Proxy(
    await new Promise((resolve, reject) => new IndexedDb({namespace: name}, resolve, reject)) as object,
    {
      get: function (db:any, method: string) {
        if(db.collections.hasOwnProperty(method)) {
          return new Proxy(db[method] as object, {
            get: function (obj:any, prop:string) {

              if(['upsert', 'findOne', 'cache', 'seed', 'uncache', 'resolveUpserts', 'remove', 'resolveRemove'].includes(prop)) {
                obj[prop][util.promisify.custom] = (...args: any) => {
                  return new Promise((resolve, reject) => {
                    obj[prop](...args, resolve, reject);
                  });
                };

                return util.promisify(obj[prop]);
              }

              if(prop === 'find') {

                return new Proxy(obj[prop], {
                  apply(target: any, collection: any, argArray: any[] = []): any {
                    return new Proxy(target(...argArray), {
                      get: function (res:any, fetch:string) {
                        if(fetch === 'fetch') {
                          res[fetch][util.promisify.custom] = () => {
                            return new Promise((resolve, reject) => {
                              argArray.length = 2;
                              collection._findFetch(...Array.from(argArray, (v) => v ?? {}) , resolve, reject);
                            });
                          };

                          return util.promisify(res[fetch]);
                        }
                        return res[fetch];
                      }
                    })
                  }
                })

              }

              return obj[prop];
            },
          });

        }

        return db[method];
      }
    }
  );
}
