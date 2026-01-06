
import { KsefClient, KsefTokenPermission } from '../src/services/ksef/KsefClient';

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    const client = new KsefClient();

    try {
        if (command === 'list') {
            console.log('Fetching tokens...');
            const result = await client.queryTokens();
            console.log(JSON.stringify(result, null, 2));
        } else if (command === 'generate') {
            const description = args[1];
            const permissionsStr = args[2];

            if (!description || !permissionsStr) {
                console.error('Usage: generate <description> <permissions_comma_separated>');
                console.error('Example: generate "My Token" InvoiceRead,InvoiceWrite');
                process.exit(1);
            }

            const permissions = permissionsStr.split(',') as KsefTokenPermission[];
            // Validate permissions
            const validPermissions = Object.values(KsefTokenPermission);
            for (const p of permissions) {
                if (!validPermissions.includes(p)) {
                    console.error(`Invalid permission: ${p}. Valid permissions: ${validPermissions.join(', ')}`);
                    process.exit(1);
                }
            }

            console.log(`Generating token "${description}" with permissions: ${permissions.join(', ')}...`);
            const result = await client.generateToken({
                description,
                permissions
            });
            console.log('Token generated successfully:');
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log('Usage:');
            console.log('  list - List all tokens');
            console.log('  generate <description> <permissions> - Generate a new token');
        }
    } catch (error: any) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('API Response:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

main();
