import {FastifyReply, FastifyRequest} from "fastify";

import {config} from "../../config";
import {prisma} from "../../db";

interface ExchangeRateApiResponse {
    "success": boolean,
    "timestamp": string,
    "base": "EUR",
    "date": string,
    "rates": Record<'USD' | 'PLN' | 'GBP', number>
}

export const syncExchangeRate = async (
    req: FastifyRequest,
    reply: FastifyReply,
): Promise<FastifyReply> => {
    const today = new Date().toISOString().split('T')[0];

    const todayExchangeRate = await prisma.exchangeRates.findFirst({
        where: {
            date: today
        }
    });

    if(todayExchangeRate) return reply.send(todayExchangeRate);

    const protocol = 'http';
    const path = 'api.exchangeratesapi.io/v1/latest';
    const exchangeToken = config.EXCHANGE_RATES_API_TOKEN;
    const queryString = new URLSearchParams({
        access_key: exchangeToken,
        format: '1',
        symbols: 'USD,PLN,GBP'
    }).toString();

    const response = await fetch(`${protocol}://${path}?${queryString}`);
    const data = await response.json() as ExchangeRateApiResponse;

    try {
        const exchangeRate = await prisma.exchangeRates.create({
            data: {
                date: data.date,
                EUR: 1,
                PLN: data.rates.PLN,
                GBP: data.rates.GBP,
                USD: data.rates.USD
            }
        });

        return reply.send(exchangeRate);
    } catch (error) {
        const exchangeRate = await prisma.exchangeRates.findFirst({
            where: {
                date: data.date
            }
        });

        if(!exchangeRate) throw new Error('Exchange rate not found');
        return reply.send(exchangeRate);
    }
}