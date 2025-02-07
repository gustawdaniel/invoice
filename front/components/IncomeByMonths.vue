<template>
  <Bar
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

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  type Plugin
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

function valueOfInvoicesAgo(ago: number, category: PaymentCategory, currency: 'PLN' | 'EUR' | 'USD'): number {
  const datePrefix = dayjs().subtract(ago, 'month').format('YYYY-MM');
  const selectedInvoices = invoices.value.filter(inv => inv.issueDate.startsWith(datePrefix) && (category === 'waiting' ? !inv.paymentDate : inv.paymentDate));

  if (category === 'paid') {
    console.log(`ago`, ago, selectedInvoices.map(invoice => [
      `${invoice.client.name} / ${invoice.id} / ${invoice.paymentDate} / ${invoice.issueDate}`,
      paid(invoice),
      exchange(category === 'paid' ? paid(invoice) : total(invoice) - paid(invoice), invoice.currency, 'PLN')
    ]));
    console.log(selectedInvoices.reduce((sum, invoice) => {
      return sum + exchange(category === 'paid' ? paid(invoice) : total(invoice) - paid(invoice), invoice.currency, 'PLN');
    }, 0))
  }

  return selectedInvoices.reduce((sum, invoice) => {
    return sum + exchange(category === 'paid' ? paid(invoice) : total(invoice) - paid(invoice), invoice.currency, 'PLN');
  }, 0)

}

// const monthRange = 7;
const monthRange = 12;
const monthFuture = 1;

const chartData = {
  labels: [...new Array(monthRange)].map((e, i, a) => dayjs().subtract(a.length - 1 - i - monthFuture, 'months').format('MMMM')),
  datasets: [
    {
      data: [...new Array(monthRange)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i - monthFuture, 'paid', 'PLN')),
      label: 'Paid',
      backgroundColor: '#27AE60'
    },
    {
      data: [...new Array(monthRange)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i - monthFuture, 'waiting', 'PLN')),
      label: 'Waiting',
      backgroundColor: '#F4D03F'
    },
    {
      data: [...new Array(monthRange)].map((e, i, a) => valueOfInvoicesAgo(a.length - 1 - i - monthFuture, 'withholding', 'PLN')),
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
