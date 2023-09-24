<template>
  <Bar
      class="h-30"
      :chart-options="chartOptions"
      :chart-data="chartData"
      :chart-id="chartId"
      :plugins="plugins"
      :css-classes="cssClasses"
      :styles="styles"
      :width="width"
      :height="height"
  />
</template>

<script setup lang="ts">
import {Bar} from 'vue-chartjs'

import {PropType} from 'vue'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
    Plugin
} from 'chart.js'
import dayjs from "dayjs";
import {invoices} from "~/store";
import {total, paid, exchange} from "~/helpers/total";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const props = defineProps({
    chartId: {
        type: String,
        default: 'bar-chart'
    },
    width: {
        type: Number,
        default: 400
    },
    height: {
        type: Number,
        default: 100
    },
    cssClasses: {
        default: '',
        type: String
    },
    styles: {
        type: Object as PropType<Partial<CSSStyleDeclaration>>,
        default: () => {
        }
    },
    plugins: {
        type: Array as PropType<Plugin<'bar'>[]>,
        default: () => []
    }
})

type PaymentCategory = 'paid' | 'waiting' | 'withholding';

function valueOfInvoicesAgo(monthsAgo: number, category: PaymentCategory, currency: 'PLN' | 'EUR' | 'USD'): number {
    const datePrefix = dayjs().subtract(monthsAgo, 'month').format('YYYY-MM');
    const selectedInvoices = invoices.value.filter(inv => inv.issueDate.startsWith(datePrefix) && (category === 'waiting' ? !inv.paymentDate : inv.paymentDate));

    return selectedInvoices.reduce((sum, invoice) => {
        return sum + exchange(category === 'paid' ? paid(invoice) : total(invoice) - paid(invoice), invoice.currency, 'PLN');
    }, 0)

}

const monthsAgo = 7;

const chartData = {
    labels: [...new Array(monthsAgo)].map((e, i, a) => dayjs().subtract(a.length - 1 - i, 'months').format('MMMM')),
    datasets: [
        {
            data: [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, 'paid', 'PLN')),
            label: 'Paid',
            backgroundColor: '#27AE60'
        },
        {
            data: [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, 'waiting', 'PLN')),
            label: 'Waiting',
            backgroundColor: '#F4D03F'
        },
        {
            data: [...new Array(monthsAgo)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i, 'withholding', 'PLN')),
            label: 'Withholding',
            backgroundColor: '#c73ff4'
        }
    ]
}

const chartOptions = {
    responsive: true, scales: {
        x: {
            stacked: true,
        },
        y: {
            stacked: true
        }
    }
}

const chartId = props.chartId;
const width = props.width;
const height = props.height;
const cssClasses = props.cssClasses;
const styles = props.styles;
const plugins = props.plugins;

</script>
