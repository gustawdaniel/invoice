import {getFastify} from './fastify';
import { config } from './config';
import {migrateKsefModes} from "./migrations/ksefModes";
import {migrateCostLinks} from "./migrations/costLinks";

const server = getFastify();

migrateKsefModes()
    .catch(error => console.error('ksef modes migration failed', error))
    .then(() => migrateCostLinks())
    .catch(error => console.error('cost links migration failed', error))
    .finally(() => server.listen(
        { port: config.PORT, host: '0.0.0.0' },
        (err: Error | null, host: string) => {
            if (err) {
                throw err;
            }
            console.info(`server listening on ${host}`);
        },
    ));
